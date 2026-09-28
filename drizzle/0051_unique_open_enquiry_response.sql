UPDATE next_actions
SET status='complete', completed_at=COALESCE(completed_at,CURRENT_TIMESTAMP)
WHERE resource_type='enquiry'
  AND action_type='respond'
  AND status='open'
  AND id IN (
    SELECT id
    FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY agency_id,resource_id
          ORDER BY datetime(created_at),id
        ) AS response_rank
      FROM next_actions
      WHERE resource_type='enquiry'
        AND action_type='respond'
        AND status='open'
    )
    WHERE response_rank>1
  );

CREATE UNIQUE INDEX idx_unique_open_enquiry_response
ON next_actions(agency_id,resource_id)
WHERE resource_type='enquiry'
  AND action_type='respond'
  AND status='open';
