UPDATE next_actions
SET status = 'complete',
    completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
WHERE resource_type = 'viewing'
  AND action_type = 'viewing_reminder'
  AND status = 'open'
  AND EXISTS (
    SELECT 1
    FROM viewings
    WHERE viewings.id = next_actions.resource_id
      AND viewings.agency_id = next_actions.agency_id
      AND viewings.status IN ('Completed', 'Cancelled', 'No-show')
  );
