# Architecture

```text
User
  -> Next.js frontend
  -> Better Auth on NestJS API
  -> Organization -> Workspace/Brand -> Amazon account -> Amazon US
  -> Manual or hourly BullMQ job
  -> Redis locally / Upstash in production
  -> Worker
       -> mock adapter now
       -> SP-API and Ads API later
  -> raw events + normalized financial tables
  -> daily true-profit snapshots
  -> dashboard, alerts, and CSV exports
```

## Profit formula

```text
Gross revenue
= product revenue + shipping revenue + promotional rebates

True net profit
= gross revenue
- referral fees
- FBA fulfillment fees
- storage fees
- refunds
- refund administration fees
- ad spend
- dated COGS
- inbound freight
- customs/duties
- prep fees
- other operating costs
```

Advertising maps to the advertised SKU. Unmapped spend remains in an `unattributed` dimension.

## Production security

- Replace query-string workspace selection with membership-based authorization.
- Encrypt Amazon refresh tokens with AWS KMS/envelope encryption.
- Store exports in S3 using short-lived signed URLs.
- Apply SP-API usage-plan-aware throttling.
- Use structured logs in CloudWatch and errors/traces in Sentry.
