export type AmazonErrorCode =
  | 'config_missing'
  | 'config_invalid'
  | 'auth_failed'
  | 'invalid_state'
  | 'not_implemented'
  | 'api_error'
  | 'throttled'
  | 'network_error';

export class AmazonError extends Error {
  readonly code: AmazonErrorCode;
  constructor(code: AmazonErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AmazonError';
    this.code = code;
  }
}

export class AmazonConfigError extends AmazonError {
  readonly missing: string[];
  constructor(message: string, missing: string[] = []) {
    super(missing.length > 0 ? 'config_missing' : 'config_invalid', message);
    this.name = 'AmazonConfigError';
    this.missing = missing;
  }
}

export class AmazonAuthError extends AmazonError {
  readonly oauthError?: string;
  constructor(message: string, oauthError?: string, options?: { cause?: unknown }) {
    super('auth_failed', message, options);
    this.name = 'AmazonAuthError';
    this.oauthError = oauthError;
  }
}

export class AmazonApiError extends AmazonError {
  readonly status: number;
  readonly requestId?: string;
  readonly errorType?: string;
  readonly retryable: boolean;
  constructor(options: {
    message: string;
    status: number;
    requestId?: string;
    errorType?: string;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(options.status === 429 ? 'throttled' : 'api_error', options.message, { cause: options.cause });
    this.name = 'AmazonApiError';
    this.status = options.status;
    this.requestId = options.requestId;
    this.errorType = options.errorType;
    this.retryable = options.retryable ?? (options.status === 429 || options.status >= 500);
  }
}

export class AmazonNotImplementedError extends AmazonError {
  constructor(message: string) {
    super('not_implemented', message);
    this.name = 'AmazonNotImplementedError';
  }
}
