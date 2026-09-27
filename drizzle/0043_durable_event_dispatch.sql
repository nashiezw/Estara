DELETE FROM `webhook_deliveries`
WHERE `id` IN (
  SELECT `id`
  FROM (
    SELECT
      `id`,
      ROW_NUMBER() OVER (
        PARTITION BY `agency_id`, `subscription_id`, `event_id`
        ORDER BY
          CASE `status`
            WHEN 'delivered' THEN 0
            WHEN 'failed' THEN 1
            WHEN 'pending' THEN 2
            ELSE 3
          END,
          `attempts` DESC,
          `created_at` DESC,
          `id` DESC
      ) AS `duplicate_rank`
    FROM `webhook_deliveries`
  )
  WHERE `duplicate_rank` > 1
);

CREATE UNIQUE INDEX `idx_webhook_delivery_event_once`
ON `webhook_deliveries` (`agency_id`, `subscription_id`, `event_id`);
