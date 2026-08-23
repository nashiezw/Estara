# ESTARA Environment Variables

Last updated: 2026-08-23

Never commit real secrets. Use `.env.example` only for names and safe placeholders. Production secrets must go into the hosting/deployment secret store.

Non-sensitive Worker runtime variables that must survive every deployment are version-controlled in `config/cloudflare-production-vars.json` and copied into the generated Wrangler config by `npm run deploy`. Do not add secret values to that file.

## Cloudflare Bindings

These are bindings rather than normal `.env` variables in most Cloudflare deployments:

| Name | Purpose | Required |
| --- | --- | --- |
| `DB` | D1 database binding used by app routes and policies. | Required in all real environments. |
| `MEDIA` | Private R2 bucket for media, documents, marketing outputs and reports. | Required for production. |
| `ASSETS` | Static asset binding used by the worker. | Required for deployed worker assets. |
| `IMAGES` | Cloudflare image transform binding used by the worker. | Required if image transforms are enabled. |

## Variables

| Variable | Purpose | Required | Where To Get It |
| --- | --- | --- | --- |
| `PUBLIC_SITE_DOMAIN` | Domain suffix used to resolve ESTARA-hosted tenant subdomains. Production standard is `estara.co.zw`, making tenant websites `{tenant}.estara.co.zw`. | Production required if tenant subdomains are used. | Normal Wrangler var in `config/cloudflare-production-vars.json`. |
| `BACKUP_ENCRYPTION_KEY` | Base64-encoded 32-byte key for AES-256-GCM backup encryption. | Production required for backups. | Cloudflare secret. |
| `OPENAI_API_KEY` | Server-only key for governed draft assistance. | Optional unless AI assistance is enabled. | Cloudflare secret. |
| `OPENAI_MODEL` | Model used for governed draft assistance. | Optional; development default is acceptable. | Normal Wrangler var if overridden. |
| `CLOUDFLARE_ACCOUNT_ID` | Account used for Cloudflare provider checks/integration. | Production required for provider readiness. | Normal Wrangler var or CI variable; not a secret by itself. |
| `CLOUDFLARE_API_TOKEN` | Token for Cloudflare provider operations/checks. | Production required if automated provider checks run. | Cloudflare secret or CI secret. |
| `CLOUDFLARE_D1_DATABASE_ID` | Optional override for the committed production D1 database id used by Wrangler when generating the `DB` binding. | Optional override. | Cloudflare dashboard > D1 SQL Database > your database > Settings > Database ID. |
| `CLOUDFLARE_DATABASE_ID` | Backwards-compatible alias for `CLOUDFLARE_D1_DATABASE_ID`. Prefer the D1-specific name for new setups. | Optional alias. | Same value as `CLOUDFLARE_D1_DATABASE_ID`. |
| `CLOUDFLARE_R2_BUCKET_NAME` | Real production R2 bucket name used by Wrangler when generating the `MEDIA` binding. | Production required if the bucket is not named `site-creator-r2`. | Cloudflare dashboard > R2 Object Storage > your bucket. |
| `MEDIA_BUCKET` | Name of production media bucket. The actual app storage path uses the `MEDIA` R2 binding. | Production required. | Normal Wrangler var in `config/cloudflare-production-vars.json`; R2 binding remains `MEDIA`. |
| `BACKUP_BUCKET` | Name reserved for production backup storage/readiness. Current backup implementation writes encrypted tenant backups through the `MEDIA` R2 binding. | Production required. | Normal Wrangler var in `config/cloudflare-production-vars.json`. |
| `RESEND_API_KEY` | Email provider API key. | Production required for email. | Cloudflare secret. |
| `RESEND_FROM_EMAIL` | Verified sender address. | Production required for email. | Normal Wrangler var. |
| `RESEND_WEBHOOK_SECRET` | Secret used to verify email provider webhooks. | Production required if webhooks are enabled. | Cloudflare secret. |
| `FCM_PROJECT_ID` | Firebase project ID for push notifications. | Optional until push is launched. | Normal Wrangler var. |
| `FCM_CLIENT_EMAIL` | Firebase service account email. | Optional until push is launched. | Normal Wrangler var; server-side only. |
| `FCM_PRIVATE_KEY` | Firebase service account private key. | Optional secret until push is launched. | Cloudflare secret. |
| `NEXT_PUBLIC_FCM_VAPID_KEY` | Browser-visible push VAPID key. | Optional until push is launched. | Normal build-time public variable; also safe as a Worker var if server readiness checks need it. |
| `SENTRY_DSN` | Error monitoring DSN. | Production required for monitoring. | Normal Wrangler var. |
| `SENTRY_RELEASE` | Deployed app release identifier sent with server error events. | Production required for monitoring. | Normal Wrangler var or CI-provided release value. |
| `SENTRY_AUTH_TOKEN` | Token for release/source map operations. | Production required if release uploads are used. | CI secret or Cloudflare secret; never a normal var. |
| `SENTRY_ORG` | Sentry organisation slug. | Production required if release uploads are used. | Normal CI variable or Wrangler var. |
| `SENTRY_PROJECT` | Sentry project slug. | Production required if release uploads are used. | Normal CI variable or Wrangler var. |
| `STRIPE_SECRET_KEY` | Live Stripe API key. | Required if online payments launch. | Cloudflare secret. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. | Required if online payments launch. | Cloudflare secret. |
| `STRIPE_PRICE_STARTER` | Live Starter plan price ID. | Required if online payments launch. | Normal Wrangler var. |
| `STRIPE_PRICE_GROWTH` | Live Growth plan price ID. | Required if online payments launch. | Normal Wrangler var. |

## Development

For local development, leave unavailable production secrets blank unless testing that provider. Features must fail safely when providers are not configured.

## Preview

Preview environments should use non-production provider accounts where possible. Never reuse live payment secrets in throwaway previews.

## Production

Production must have:

- `DB` binding.
- `MEDIA` binding.
- Backup key and backup bucket if backups are enabled.
- Email provider secrets if any transactional email is required.
- Monitoring secrets before public launch.
- Payment secrets only when live billing is approved.
- `PUBLIC_SITE_DOMAIN=estara.co.zw` when ESTARA-hosted tenant subdomains are used.

Do not set `PUBLIC_SITE_DOMAIN` to `sites.estara.co.zw` for new deployments. The old nested hostname pattern is legacy-only and must not be used for newly generated tenant website links.

## Where To Paste Secrets

Paste secrets into the hosting provider's secret/environment-variable interface, not into chat and not into committed files.
