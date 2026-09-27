UPDATE enquiries
SET status = CASE
      WHEN stage IN ('Won', 'Lost', 'Closed') THEN stage
      ELSE 'Contacted'
    END,
    contacted_at = COALESCE(contacted_at, created_at)
WHERE status = 'New'
  AND stage <> 'New';

UPDATE next_actions
SET status = 'complete',
    completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
WHERE resource_type = 'enquiry'
  AND action_type = 'respond'
  AND status = 'open'
  AND EXISTS (
    SELECT 1
    FROM enquiries
    WHERE enquiries.id = next_actions.resource_id
      AND enquiries.agency_id = next_actions.agency_id
      AND enquiries.stage <> 'New'
  );
