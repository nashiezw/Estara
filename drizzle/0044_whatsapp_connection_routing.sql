INSERT INTO audit_logs(id,agency_id,actor_user_id,action,resource_type,resource_id,detail)
SELECT
  lower(hex(randomblob(16))),
  agency_id,
  'system:migration',
  'integration.connection_disabled_duplicate_phone',
  'integration_connection',
  id,
  json_object(
    'provider', provider,
    'phoneNumberId', json_extract(configuration, '$.phoneNumberId'),
    'reason', 'A different pending or active connection already owns this WhatsApp phone number ID.'
  )
FROM (
  SELECT
    integration_connections.*,
    ROW_NUMBER() OVER (
      PARTITION BY json_extract(configuration, '$.phoneNumberId')
      ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at, id
    ) AS duplicate_rank
  FROM integration_connections
  WHERE provider='whatsapp_cloud'
    AND status IN ('pending','active')
    AND COALESCE(json_extract(configuration, '$.phoneNumberId'), '')<>''
)
WHERE duplicate_rank>1;

UPDATE integration_connections
SET status='disabled', updated_at=CURRENT_TIMESTAMP
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY json_extract(configuration, '$.phoneNumberId')
        ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, created_at, id
      ) AS duplicate_rank
    FROM integration_connections
    WHERE provider='whatsapp_cloud'
      AND status IN ('pending','active')
      AND COALESCE(json_extract(configuration, '$.phoneNumberId'), '')<>''
  )
  WHERE duplicate_rank>1
);

CREATE UNIQUE INDEX idx_whatsapp_routable_phone_number
ON integration_connections(json_extract(configuration, '$.phoneNumberId'))
WHERE provider='whatsapp_cloud'
  AND status IN ('pending','active')
  AND COALESCE(json_extract(configuration, '$.phoneNumberId'), '')<>'';
