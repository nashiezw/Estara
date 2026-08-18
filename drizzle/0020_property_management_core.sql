CREATE TABLE managed_properties (
 id TEXT PRIMARY KEY NOT NULL, agency_id TEXT NOT NULL REFERENCES agencies(id), property_id TEXT NOT NULL REFERENCES properties(id), landlord_contact_id TEXT NOT NULL REFERENCES contacts(id), management_fee_basis_points INTEGER NOT NULL DEFAULT 0, starts_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_managed_properties_property ON managed_properties(agency_id,property_id);
CREATE INDEX idx_managed_properties_landlord ON managed_properties(agency_id,landlord_contact_id,status);
CREATE TABLE leases (
 id TEXT PRIMARY KEY NOT NULL, agency_id TEXT NOT NULL REFERENCES agencies(id), managed_property_id TEXT NOT NULL REFERENCES managed_properties(id), tenant_contact_id TEXT NOT NULL REFERENCES contacts(id), starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, rent_minor INTEGER NOT NULL, deposit_minor INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD', due_day INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'draft', created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_leases_property_status ON leases(agency_id,managed_property_id,status);
CREATE INDEX idx_leases_tenant ON leases(agency_id,tenant_contact_id,status);
CREATE TABLE rent_charges (
 id TEXT PRIMARY KEY NOT NULL, agency_id TEXT NOT NULL REFERENCES agencies(id), lease_id TEXT NOT NULL REFERENCES leases(id), period TEXT NOT NULL, due_at TEXT NOT NULL, amount_minor INTEGER NOT NULL, allocated_minor INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'due', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_rent_charges_lease_period ON rent_charges(lease_id,period);
CREATE INDEX idx_rent_charges_arrears ON rent_charges(agency_id,status,due_at);
CREATE TABLE rent_payments (
 id TEXT PRIMARY KEY NOT NULL, agency_id TEXT NOT NULL REFERENCES agencies(id), lease_id TEXT NOT NULL REFERENCES leases(id), payer_contact_id TEXT NOT NULL REFERENCES contacts(id), amount_minor INTEGER NOT NULL, unallocated_minor INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'USD', method TEXT NOT NULL, provider TEXT, provider_reference TEXT, received_at TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_rent_payments_provider_ref ON rent_payments(agency_id,provider,provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX idx_rent_payments_lease_received ON rent_payments(agency_id,lease_id,received_at);
CREATE TABLE payment_allocations (
 id TEXT PRIMARY KEY NOT NULL, agency_id TEXT NOT NULL REFERENCES agencies(id), payment_id TEXT NOT NULL REFERENCES rent_payments(id), charge_id TEXT NOT NULL REFERENCES rent_charges(id), amount_minor INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_payment_allocations_payment_charge ON payment_allocations(payment_id,charge_id);
CREATE INDEX idx_payment_allocations_charge ON payment_allocations(agency_id,charge_id);
CREATE TABLE rent_receipts (
 id TEXT PRIMARY KEY NOT NULL, agency_id TEXT NOT NULL REFERENCES agencies(id), payment_id TEXT NOT NULL REFERENCES rent_payments(id), receipt_number TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL, issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, issued_by TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_rent_receipts_number ON rent_receipts(agency_id,receipt_number);
CREATE UNIQUE INDEX idx_rent_receipts_payment ON rent_receipts(payment_id);
CREATE TABLE tenancy_deposits (
 id TEXT PRIMARY KEY NOT NULL, agency_id TEXT NOT NULL REFERENCES agencies(id), lease_id TEXT NOT NULL REFERENCES leases(id), amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', status TEXT NOT NULL DEFAULT 'held', received_payment_id TEXT REFERENCES rent_payments(id), released_minor INTEGER NOT NULL DEFAULT 0, deduction_minor INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tenancy_deposits_lease ON tenancy_deposits(agency_id,lease_id,status);
CREATE TABLE property_expenses (
 id TEXT PRIMARY KEY NOT NULL, agency_id TEXT NOT NULL REFERENCES agencies(id), managed_property_id TEXT NOT NULL REFERENCES managed_properties(id), landlord_contact_id TEXT NOT NULL REFERENCES contacts(id), category TEXT NOT NULL, description TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', incurred_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved', created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_property_expenses_property_date ON property_expenses(agency_id,managed_property_id,incurred_at);
CREATE TABLE landlord_statements (
 id TEXT PRIMARY KEY NOT NULL, agency_id TEXT NOT NULL REFERENCES agencies(id), landlord_contact_id TEXT NOT NULL REFERENCES contacts(id), period_start TEXT NOT NULL, period_end TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', rent_collected_minor INTEGER NOT NULL, management_fee_minor INTEGER NOT NULL, expenses_minor INTEGER NOT NULL, net_payable_minor INTEGER NOT NULL, snapshot TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'final', finalized_by TEXT NOT NULL, finalized_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_landlord_statements_period ON landlord_statements(agency_id,landlord_contact_id,period_start,period_end);
CREATE INDEX idx_landlord_statements_landlord ON landlord_statements(agency_id,landlord_contact_id,finalized_at);
PRAGMA optimize;
