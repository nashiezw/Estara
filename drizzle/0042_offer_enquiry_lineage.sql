ALTER TABLE `offers` ADD `enquiry_id` text REFERENCES `enquiries`(`id`);

CREATE INDEX `idx_offers_agency_enquiry` ON `offers` (`agency_id`, `enquiry_id`, `submitted_at`);

UPDATE `deals`
SET `offer_id` = COALESCE(
      `offer_id`,
      (SELECT o.id FROM offers o
       WHERE o.agency_id=deals.agency_id AND o.property_id=deals.property_id AND o.contact_id=deals.contact_id
       ORDER BY o.submitted_at DESC LIMIT 1)
    ),
    `enquiry_id` = COALESCE(
      `enquiry_id`,
      (SELECT o.enquiry_id FROM offers o
       WHERE o.agency_id=deals.agency_id AND o.property_id=deals.property_id AND o.contact_id=deals.contact_id AND o.enquiry_id IS NOT NULL
       ORDER BY o.submitted_at DESC LIMIT 1),
      (SELECT e.id FROM enquiries e
       WHERE e.agency_id=deals.agency_id AND e.property_id=deals.property_id AND e.contact_id=deals.contact_id
       ORDER BY e.created_at DESC LIMIT 1)
    );

CREATE TRIGGER `trg_deals_offer_enquiry_lineage`
AFTER INSERT ON `deals`
WHEN NEW.`offer_id` IS NULL OR NEW.`enquiry_id` IS NULL
BEGIN
  UPDATE `deals`
  SET `offer_id` = COALESCE(
        NEW.`offer_id`,
        (SELECT o.id FROM offers o
         WHERE o.agency_id=NEW.agency_id AND o.property_id=NEW.property_id AND o.contact_id=NEW.contact_id
         ORDER BY o.submitted_at DESC LIMIT 1)
      ),
      `enquiry_id` = COALESCE(
        NEW.`enquiry_id`,
        (SELECT o.enquiry_id FROM offers o
         WHERE o.agency_id=NEW.agency_id AND o.property_id=NEW.property_id AND o.contact_id=NEW.contact_id AND o.enquiry_id IS NOT NULL
         ORDER BY o.submitted_at DESC LIMIT 1),
        (SELECT e.id FROM enquiries e
         WHERE e.agency_id=NEW.agency_id AND e.property_id=NEW.property_id AND e.contact_id=NEW.contact_id
         ORDER BY e.created_at DESC LIMIT 1)
      )
  WHERE id=NEW.id AND agency_id=NEW.agency_id;
END;
