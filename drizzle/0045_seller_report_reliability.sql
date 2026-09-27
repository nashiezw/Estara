ALTER TABLE seller_reports ADD COLUMN approval_started_at TEXT;

DELETE FROM seller_deliveries
WHERE report_id IS NOT NULL
  AND rowid NOT IN (
    SELECT MIN(rowid)
    FROM seller_deliveries
    WHERE report_id IS NOT NULL
    GROUP BY agency_id, report_id, lower(recipient_email), channel
  );

DELETE FROM seller_deliveries
WHERE document_id IS NOT NULL
  AND rowid NOT IN (
    SELECT MIN(rowid)
    FROM seller_deliveries
    WHERE document_id IS NOT NULL
    GROUP BY agency_id, document_id, lower(recipient_email), channel
  );

CREATE UNIQUE INDEX idx_seller_delivery_report_recipient_channel
ON seller_deliveries(agency_id, report_id, lower(recipient_email), channel)
WHERE report_id IS NOT NULL;

CREATE UNIQUE INDEX idx_seller_delivery_document_recipient_channel
ON seller_deliveries(agency_id, document_id, lower(recipient_email), channel)
WHERE document_id IS NOT NULL;
