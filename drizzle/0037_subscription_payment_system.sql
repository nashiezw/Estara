ALTER TABLE plan_versions ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE plan_versions ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plan_versions ADD COLUMN trial_available INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plan_versions ADD COLUMN trial_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plan_versions ADD COLUMN allow_trial_without_payment INTEGER NOT NULL DEFAULT 1;
ALTER TABLE plan_versions ADD COLUMN trial_once INTEGER NOT NULL DEFAULT 1;

ALTER TABLE agency_subscriptions ADD COLUMN billing_interval TEXT NOT NULL DEFAULT 'month';
ALTER TABLE agency_subscriptions ADD COLUMN payment_provider TEXT;
ALTER TABLE agency_subscriptions ADD COLUMN external_subscription_id TEXT;
ALTER TABLE agency_subscriptions ADD COLUMN last_payment_request_id TEXT;

CREATE TABLE billing_payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  account_holder TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  merchant_number TEXT NOT NULL DEFAULT '',
  mobile_number TEXT NOT NULL DEFAULT '',
  reference_instructions TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'USD',
  instructions TEXT NOT NULL DEFAULT '',
  qr_media_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  countries TEXT NOT NULL DEFAULT '[]',
  currencies TEXT NOT NULL DEFAULT '[]',
  allowed_plan_version_ids TEXT NOT NULL DEFAULT '[]',
  stripe_mode TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_billing_payment_methods_enabled ON billing_payment_methods(enabled, display_order);

CREATE TABLE billing_payment_requests (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  subscription_id TEXT NOT NULL REFERENCES agency_subscriptions(id),
  plan_version_id TEXT NOT NULL REFERENCES plan_versions(id),
  invoice_id TEXT REFERENCES billing_invoices(id),
  payment_method_id TEXT REFERENCES billing_payment_methods(id),
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_payment',
  currency TEXT NOT NULL,
  amount_due_minor INTEGER NOT NULL,
  amount_paid_minor INTEGER NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL DEFAULT 'month',
  period_starts_at TEXT,
  period_ends_at TEXT,
  payment_reference TEXT NOT NULL,
  transaction_reference TEXT,
  payment_date TEXT,
  agency_notes TEXT NOT NULL DEFAULT '',
  proof_object_key TEXT,
  proof_original_name TEXT,
  proof_mime_type TEXT,
  proof_byte_size INTEGER,
  submitted_at TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_note TEXT,
  rejection_reason TEXT,
  external_checkout_id TEXT,
  external_event_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_billing_payment_requests_reference ON billing_payment_requests(payment_reference);
CREATE INDEX idx_billing_payment_requests_agency_status ON billing_payment_requests(agency_id, status, created_at);
CREATE INDEX idx_billing_payment_requests_review_queue ON billing_payment_requests(status, submitted_at);

CREATE TABLE billing_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processed',
  detail TEXT NOT NULL DEFAULT '{}',
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_billing_webhook_events_provider_event ON billing_webhook_events(provider, event_id);

INSERT OR IGNORE INTO billing_payment_methods (id,name,type,account_holder,bank_name,reference_instructions,currency,instructions,enabled,display_order,currencies,created_by)
VALUES
('pay-bank-transfer-usd','Bank transfer','bank_transfer','ESTARA Billing','Agency configured bank','Use the payment reference shown on the invoice.','USD','Transfer the invoice total, then upload your bank proof for finance review.',1,10,'["USD"]','migration'),
('pay-cash-usd','Cash deposit','cash','ESTARA Billing','','Use the payment reference shown on the invoice.','USD','Record cash or branch deposit details, then upload a receipt for finance review.',0,70,'["USD"]','migration'),
('pay-stripe-usd','Card or online payment','stripe','','','Stripe checkout reference is created automatically.','USD','Pay securely by card or online wallet. The subscription activates only after Stripe confirms payment.',0,90,'["USD"]','migration');

UPDATE plan_versions SET trial_available=CASE WHEN price_minor>0 THEN 1 ELSE 0 END,trial_days=COALESCE(json_extract(limits,'$.trialDays'),0),allow_trial_without_payment=1,trial_once=1 WHERE trial_days=0;
UPDATE agency_subscriptions SET state='free',trial_starts_at=NULL,trial_ends_at=NULL,current_period_starts_at=NULL,current_period_ends_at=NULL WHERE state='trialing' AND plan_version_id IN (SELECT id FROM plan_versions WHERE price_minor=0);
