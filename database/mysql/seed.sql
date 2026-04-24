USE wasco_water_billing;

INSERT INTO districts (district_id, district_name) VALUES
('DIS-001', 'Maseru'),
('DIS-002', 'Leribe'),
('DIS-003', 'Berea')
ON DUPLICATE KEY UPDATE district_name = VALUES(district_name);

INSERT INTO branches (branch_id, district_id, branch_name, branch_location, phone, email) VALUES
('BR-001', 'DIS-001', 'Maseru Central Branch', 'Maseru CBD', '+26650000001', 'maseru@wasco.local'),
('BR-002', 'DIS-002', 'Leribe Branch', 'Hlotse', '+26650000002', 'leribe@wasco.local'),
('BR-003', 'DIS-003', 'Berea Branch', 'Teyateyaneng', '+26650000003', 'berea@wasco.local')
ON DUPLICATE KEY UPDATE branch_name = VALUES(branch_name), email = VALUES(email);

INSERT INTO customers (customer_id, branch_id, account_number, customer_type, first_name, last_name, phone, email, national_id, address_line1, address_line2, district, village_town, connection_status)
VALUES
('CUS-1001', 'BR-001', 'ACC-1001', 'RESIDENTIAL', 'Samuel', 'Phororo', '+26659000001', 'samuel@example.com', '9001011234088', 'Ha Thetsane', 'Plot 10', 'Maseru', 'Maseru', 'ACTIVE'),
('CUS-1002', 'BR-002', 'ACC-1002', 'COMMERCIAL', 'Mpho', 'Business', '+26659000002', 'mpho@example.com', '9101011234088', 'Main North 1', 'Shop 12', 'Leribe', 'Hlotse', 'ACTIVE'),
('CUS-1003', 'BR-003', 'ACC-1003', 'INSTITUTIONAL', 'Berea', 'Clinic', '+26659000003', 'clinic@example.com', '9201011234088', 'TY Clinic Road', 'Health Block', 'Berea', 'Teyateyaneng', 'ACTIVE')
ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), email = VALUES(email);

INSERT INTO app_users (user_id, branch_id, customer_id, full_name, username, email, password_hash, role, account_status)
VALUES
('USR-0001', 'BR-001', NULL, 'System Administrator', 'admin', 'admin@wasco.local', 'admin123', 'ADMIN', 'ACTIVE'),
('USR-0002', 'BR-001', 'CUS-1001', 'Samuel Phororo', 'samuel', 'samuel@wasco.local', 'admin123', 'CUSTOMER', 'ACTIVE'),
('USR-0003', 'BR-002', 'CUS-1002', 'Mpho Business', 'mpho', 'mpho@wasco.local', '1234', 'CUSTOMER', 'ACTIVE'),
('USR-0004', 'BR-001', NULL, 'Maseru Branch Manager', 'manager', 'manager@wasco.local', 'manager123', 'BRANCH_MANAGER', 'ACTIVE')
ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), username = VALUES(username), email = VALUES(email), password_hash = VALUES(password_hash), role = VALUES(role), account_status = VALUES(account_status);

INSERT INTO billing_rates (rate_id, customer_type, tier_name, min_units, max_units, cost_per_unit, sewer_charge, meter_charge, effective_from, effective_to, is_active)
VALUES
('RATE-001', 'RESIDENTIAL', 'Residential Tier 1', 0, 20, 4.50, 15.00, 10.00, '2026-01-01', NULL, TRUE),
('RATE-002', 'RESIDENTIAL', 'Residential Tier 2', 21, 999999, 6.00, 15.00, 10.00, '2026-01-01', NULL, TRUE),
('RATE-003', 'COMMERCIAL', 'Commercial Standard', 0, 999999, 8.50, 25.00, 20.00, '2026-01-01', NULL, TRUE),
('RATE-004', 'INSTITUTIONAL', 'Institutional Standard', 0, 999999, 7.00, 18.00, 12.00, '2026-01-01', NULL, TRUE)
ON DUPLICATE KEY UPDATE tier_name = VALUES(tier_name), cost_per_unit = VALUES(cost_per_unit);

INSERT INTO meters (meter_id, customer_id, meter_number, installation_date, meter_status, last_reading)
VALUES
('MET-1001', 'CUS-1001', 'WM-1001', '2026-01-15', 'ACTIVE', 120.00),
('MET-1002', 'CUS-1002', 'WM-1002', '2026-01-15', 'ACTIVE', 540.00),
('MET-1003', 'CUS-1003', 'WM-1003', '2026-01-15', 'ACTIVE', 330.00)
ON DUPLICATE KEY UPDATE meter_number = VALUES(meter_number), last_reading = VALUES(last_reading);

INSERT INTO water_usage (usage_id, customer_id, meter_id, reading_month, reading_year, previous_reading, current_reading, units_used, reading_date, recorded_by)
VALUES
('USE-1001', 'CUS-1001', 'MET-1001', 3, 2026, 100.00, 120.00, 20.00, '2026-03-31', 'USR-0001'),
('USE-1002', 'CUS-1002', 'MET-1002', 3, 2026, 500.00, 540.00, 40.00, '2026-03-31', 'USR-0001'),
('USE-1003', 'CUS-1003', 'MET-1003', 3, 2026, 300.00, 330.00, 30.00, '2026-03-31', 'USR-0004')
ON DUPLICATE KEY UPDATE units_used = VALUES(units_used), current_reading = VALUES(current_reading);

INSERT INTO bills (bill_id, customer_id, usage_id, bill_month, bill_year, issue_date, due_date, water_charge, sewer_charge, meter_charge, arrears_brought_forward, penalties, total_amount, amount_paid, balance_due, payment_status)
VALUES
('BILL-1001', 'CUS-1001', 'USE-1001', 3, 2026, '2026-04-01', '2026-04-20', 90.00, 15.00, 10.00, 0.00, 0.00, 115.00, 40.00, 75.00, 'PARTIAL'),
('BILL-1002', 'CUS-1002', 'USE-1002', 3, 2026, '2026-04-01', '2026-04-20', 340.00, 25.00, 20.00, 0.00, 0.00, 385.00, 0.00, 385.00, 'UNPAID'),
('BILL-1003', 'CUS-1003', 'USE-1003', 3, 2026, '2026-04-01', '2026-04-20', 210.00, 18.00, 12.00, 0.00, 0.00, 240.00, 240.00, 0.00, 'PAID')
ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount), amount_paid = VALUES(amount_paid), balance_due = VALUES(balance_due), payment_status = VALUES(payment_status);

INSERT INTO payments (payment_id, bill_id, customer_id, payment_date, amount_paid, payment_method, transaction_reference, payment_status, received_by)
VALUES
('PAY-1001', 'BILL-1001', 'CUS-1001', '2026-04-05', 40.00, 'CASH', 'REC-1001', 'SUCCESS', 'USR-0001'),
('PAY-1002', 'BILL-1003', 'CUS-1003', '2026-04-08', 240.00, 'BANK_TRANSFER', 'REC-1002', 'SUCCESS', 'USR-0004')
ON DUPLICATE KEY UPDATE amount_paid = VALUES(amount_paid), payment_method = VALUES(payment_method);

INSERT INTO leakage_reports (report_id, customer_id, branch_id, report_title, description, location_description, report_status, severity)
VALUES
('LEAK-1001', 'CUS-1001', 'BR-001', 'Pipe leakage near meter', 'Visible leakage reported by customer.', 'Ha Thetsane near house gate', 'OPEN', 'MEDIUM'),
('LEAK-1002', NULL, 'BR-002', 'Street pipe burst', 'Leakage affecting road users and nearby houses.', 'Hlotse main road junction', 'IN_PROGRESS', 'HIGH')
ON DUPLICATE KEY UPDATE report_status = VALUES(report_status), severity = VALUES(severity);

INSERT INTO bill_notifications (notification_id, bill_id, customer_id, notification_type, notification_message, sent_status, sent_at)
VALUES
('NOT-1001', 'BILL-1001', 'CUS-1001', 'SMS', 'Your water bill is due on 2026-04-20.', 'SENT', NOW()),
('NOT-1002', 'BILL-1002', 'CUS-1002', 'EMAIL', 'Your water bill remains unpaid. Please settle your balance.', 'PENDING', NULL)
ON DUPLICATE KEY UPDATE notification_message = VALUES(notification_message), sent_status = VALUES(sent_status);
