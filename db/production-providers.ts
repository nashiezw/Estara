export type ProductionProviderStatus = "selected_pending_activation" | "implemented";

export type ProductionProviderDecision = {
  area: string;
  provider: string;
  status: ProductionProviderStatus;
  requiredEnv: readonly string[];
  activationEvidence: readonly string[];
};

export const PRODUCTION_PROVIDER_DECISIONS: readonly ProductionProviderDecision[] = [
  {
    area: "hosting_dns_tls_storage",
    provider: "Cloudflare Workers, Custom Domains, D1, R2, Queues and WAF malicious uploads detection",
    status: "selected_pending_activation",
    requiredEnv: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "MEDIA_BUCKET", "BACKUP_BUCKET"],
    activationEvidence: [
      "Worker deployed on the production account",
      "Custom Domain attached for app and tenant hosts",
      "Advanced certificates active",
      "D1 and R2 bindings point to production resources",
      "R2 object-create notifications feed the scan queue",
      "WAF malicious upload rules block failed scans",
    ],
  },
  {
    area: "transactional_email",
    provider: "Resend",
    status: "selected_pending_activation",
    requiredEnv: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "RESEND_WEBHOOK_SECRET"],
    activationEvidence: [
      "Sending domain verified",
      "Webhook signature verified",
      "Notification delivery ledger receives delivered, bounced and complained states",
    ],
  },
  {
    area: "web_push",
    provider: "Firebase Cloud Messaging",
    status: "selected_pending_activation",
    requiredEnv: ["FCM_PROJECT_ID", "FCM_CLIENT_EMAIL", "FCM_PRIVATE_KEY", "NEXT_PUBLIC_FCM_VAPID_KEY"],
    activationEvidence: [
      "Service worker registered on production HTTPS origin",
      "Device token capture is consent-gated",
      "Push delivery ledger records accepted, delivered and failed outcomes",
    ],
  },
  {
    area: "error_retention_alerting",
    provider: "Sentry for Cloudflare plus Cloudflare platform logs",
    status: "selected_pending_activation",
    requiredEnv: ["SENTRY_DSN", "SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"],
    activationEvidence: [
      "Server and browser release tags match deployed revision",
      "Protected error events are retained outside the app database",
      "Launch-blocking alert routes notify the product owner and operator",
    ],
  },
  {
    area: "online_payments",
    provider: "Stripe Checkout, Billing and Customer Portal",
    status: "selected_pending_activation",
    requiredEnv: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_STARTER", "STRIPE_PRICE_GROWTH"],
    activationEvidence: [
      "Checkout creates subscription sessions for live prices",
      "Signed webhooks update subscription, invoice and payment states",
      "Customer Portal session works for payment method and cancellation changes",
      "Settlement, refund and failed-payment reconciliation has a finance-owner sign-off",
    ],
  },
] as const;

export const REQUIRED_PRODUCTION_PROVIDER_ENV = [
  ...new Set(PRODUCTION_PROVIDER_DECISIONS.flatMap((decision) => decision.requiredEnv)),
] as const;

export function productionProviderDecision(area: string) {
  return PRODUCTION_PROVIDER_DECISIONS.find((decision) => decision.area === area);
}

export function productionProvidersReady(env: Record<string, string | undefined>) {
  return REQUIRED_PRODUCTION_PROVIDER_ENV.every((name) => Boolean(env[name]?.trim()));
}
