CREATE TABLE webhook_subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT NOT NULL DEFAULT '[]',
  signing_secret TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_webhook_subscriptions_agency_status ON webhook_subscriptions(agency_id,status);
CREATE TABLE webhook_deliveries (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  subscription_id TEXT NOT NULL REFERENCES webhook_subscriptions(id),
  event_id TEXT NOT NULL REFERENCES domain_events(id),
  event_type TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_body TEXT NOT NULL,
  signature TEXT NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER NOT NULL DEFAULT 1,
  next_attempt_at TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_webhook_deliveries_agency_status ON webhook_deliveries(agency_id,status,created_at);
CREATE INDEX idx_webhook_deliveries_subscription ON webhook_deliveries(subscription_id,created_at);
