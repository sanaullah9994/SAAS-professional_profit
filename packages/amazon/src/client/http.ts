import { AmazonApiError } from '../errors.js';
import { spApiEndpoint, type AmazonRegion } from '../marketplace.js';
import { acquireSlot, type RateLimit } from './rate-limit.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type QueryValue = string | number | boolean | undefined | null;

export interface SpApiRequestOptions {
  rateLimit?: RateLimit;
  timeoutMs?: number;
  absoluteUrl?: string;
}

export interface SpApiClientOptions {
  region: AmazonRegion;
  getAccessToken: () => Promise<string>;
  invalidateAccessToken?: () => void;
  userAgent?: string;
  maxAttempts?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_USER_AGENT = 'AmazonProfitSaaS/1.0 (Language=TypeScript; Platform=Node)';
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const TOKEN_ERROR_PATTERN = /access.?token|invalid.?token|unauthorized/i;

interface ParsedErrorBody {
  code?: string;
  message?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, retryAfterHeader: string | null): number {
  const exponential = Math.min(1000 * 2 ** (attempt - 1), 60_000);
  const jittered = exponential * (0.5 + Math.random() * 0.5);
  const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN;
  if (Number.isFinite(retryAfterMs) && retryAfterMs > 0) return Math.max(retryAfterMs, 500);
  return Math.max(Math.round(jittered), 500);
}

function parseErrorBody(text: string): ParsedErrorBody {
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const errors = Array.isArray(parsed.errors) ? (parsed.errors as Array<Record<string, unknown>>)[0] : undefined;
    const code = typeof errors?.code === 'string' ? errors.code : typeof parsed.code === 'string' ? parsed.code : undefined;
    const message =
      typeof errors?.message === 'string'
        ? errors.message
        : typeof parsed.message === 'string'
          ? parsed.message
          : typeof parsed.error_description === 'string'
            ? parsed.error_description
            : undefined;
    return { code, message };
  } catch {
    return {};
  }
}

export class SpApiClient {
  private readonly region: AmazonRegion;
  private readonly getAccessToken: () => Promise<string>;
  private readonly invalidateAccessToken?: () => void;
  private readonly userAgent: string;
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SpApiClientOptions) {
    this.region = options.region;
    this.getAccessToken = options.getAccessToken;
    this.invalidateAccessToken = options.invalidateAccessToken;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.maxAttempts = Math.max(1, options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T>(method: HttpMethod, path: string, query?: Record<string, QueryValue>, options: SpApiRequestOptions = {}): Promise<T> {
    const rateKey = options.rateLimit ? `override:${method}:${path}` : `${this.region}:${method}:${path}`;
    const rateLimit = options.rateLimit ?? SpApiClient.defaultRateLimit(method, path);
    const url = this.buildUrl(path, query, options.absoluteUrl);

    let tokenInvalidated = false;
    let lastError: AmazonApiError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      await acquireSlot(rateKey, rateLimit);
      const accessToken = await this.getAccessToken();
      const headers: Record<string, string> = {
        'x-amz-access-token': accessToken,
        'x-amz-date': new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        'user-agent': this.userAgent,
        accept: 'application/json',
      };

      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method,
          headers,
          signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        });
      } catch (cause) {
        lastError = new AmazonApiError({
          message: `SP-API request failed before a response was received: ${cause instanceof Error ? cause.message : String(cause)}`,
          status: 0,
          retryable: true,
          cause,
        });
        if (attempt < this.maxAttempts) {
          await sleep(backoffDelay(attempt, null));
          continue;
        }
        throw lastError;
      }

      const requestId = response.headers.get('x-amzn-RequestId') ?? undefined;
      const errorType = response.headers.get('x-amzn-ErrorType') ?? undefined;

      if (response.ok) {
        const text = await response.text();
        if (!text) return undefined as T;
        try {
          return JSON.parse(text) as T;
        } catch (cause) {
          throw new AmazonApiError({
            message: 'SP-API returned a response that could not be parsed as JSON.',
            status: response.status,
            requestId,
            retryable: false,
            cause,
          });
        }
      }

      const text = await response.text();
      const parsed = parseErrorBody(text);
      const looksLikeTokenProblem =
        !tokenInvalidated &&
        (response.status === 401 || (response.status === 403 && TOKEN_ERROR_PATTERN.test(`${errorType ?? ''} ${parsed.code ?? ''} ${parsed.message ?? ''}`)));
      if (looksLikeTokenProblem && this.invalidateAccessToken) {
        tokenInvalidated = true;
        this.invalidateAccessToken();
        continue;
      }

      const retryable = RETRYABLE_STATUS.has(response.status);
      const apiError = new AmazonApiError({
        message: `SP-API ${method} ${path} failed with status ${response.status}${parsed.message ? `: ${parsed.message}` : ''}${parsed.code ? ` (${parsed.code})` : ''}`,
        status: response.status,
        requestId,
        errorType: errorType ?? parsed.code,
        retryable,
      });
      lastError = apiError;
      if (retryable && attempt < this.maxAttempts) {
        await sleep(backoffDelay(attempt, response.headers.get('Retry-After')));
        continue;
      }
      throw apiError;
    }

    throw lastError ?? new AmazonApiError({ message: 'SP-API request failed.', status: 0, retryable: true });
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>, absoluteUrl?: string): string {
    const url = absoluteUrl ? new URL(absoluteUrl) : new URL(path, spApiEndpoint(this.region));
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue;
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private static defaultRateLimit(method: HttpMethod, path: string): RateLimit {
    if (path.startsWith('/orders/2026-01-01/orders')) return { rate: 0.0056, burst: 20 };
    if (path.startsWith('/fba/inventory/v1/summaries')) return { rate: 2, burst: 2 };
    if (path.startsWith('/orders/')) return { rate: 0.5, burst: 30 };
    return { rate: 1, burst: 5 };
  }
}
