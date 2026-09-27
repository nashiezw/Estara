CREATE TABLE whatsapp_inbound_events (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  connection_id TEXT NOT NULL REFERENCES integration_connections(id),
  provider_message_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  message_text TEXT NOT NULL DEFAULT '',
  payload_hash TEXT NOT NULL,
  property_id TEXT REFERENCES properties(id),
  contact_id TEXT REFERENCES contacts(id),
  enquiry_id TEXT REFERENCES enquiries(id),
  status TEXT NOT NULL DEFAULT 'processed',
  failure_reason TEXT,
  received_at TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_whatsapp_provider_message ON whatsapp_inbound_events(provider_message_id);
CREATE INDEX idx_whatsapp_agency_received ON whatsapp_inbound_events(agency_id,received_at);
CREATE INDEX idx_whatsapp_connection_status ON whatsapp_inbound_events(connection_id,status,received_at);
