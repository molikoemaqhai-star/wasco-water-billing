CREATE DATABASE IF NOT EXISTS wasco_water_billing;
USE wasco_water_billing;

CREATE TABLE IF NOT EXISTS districts (
    district_id VARCHAR(20) PRIMARY KEY,
    district_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS branches (
    branch_id VARCHAR(20) PRIMARY KEY,
    district_id VARCHAR(20) NOT NULL,
    branch_name VARCHAR(100) NOT NULL,
    branch_location VARCHAR(150),
    phone VARCHAR(30),
    email VARCHAR(100),
    CONSTRAINT fk_branches_district
        FOREIGN KEY (district_id) REFERENCES districts(district_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS customers (
    customer_id VARCHAR(30) PRIMARY KEY,
    branch_id VARCHAR(20) NOT NULL,
    account_number VARCHAR(30) NOT NULL UNIQUE,
    customer_type VARCHAR(20) NOT NULL,
    first_name VARCHAR(60) NOT NULL,
    last_name VARCHAR(60) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(100),
    national_id VARCHAR(30),
    address_line1 VARCHAR(150) NOT NULL,
    address_line2 VARCHAR(150),
    district VARCHAR(100),
    village_town VARCHAR(100),
    connection_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_customers_branch
        FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS app_users (
    user_id VARCHAR(30) PRIMARY KEY,
    branch_id VARCHAR(20),
    customer_id VARCHAR(30),
    full_name VARCHAR(120) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_branch
        FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_users_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS billing_rates (
    rate_id VARCHAR(30) PRIMARY KEY,
    customer_type VARCHAR(20) NOT NULL,
    tier_name VARCHAR(50) NOT NULL,
    min_units DECIMAL(10,2) NOT NULL,
    max_units DECIMAL(10,2) NULL,
    cost_per_unit DECIMAL(10,2) NOT NULL,
    sewer_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    meter_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    effective_from DATE NOT NULL,
    effective_to DATE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS meters (
    meter_id VARCHAR(30) PRIMARY KEY,
    customer_id VARCHAR(30) NOT NULL UNIQUE,
    meter_number VARCHAR(50) NOT NULL UNIQUE,
    installation_date DATE,
    meter_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    last_reading DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_meters_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS water_usage (
    usage_id VARCHAR(30) PRIMARY KEY,
    customer_id VARCHAR(30) NOT NULL,
    meter_id VARCHAR(30) NOT NULL,
    reading_month INT NOT NULL,
    reading_year INT NOT NULL,
    previous_reading DECIMAL(12,2) NOT NULL,
    current_reading DECIMAL(12,2) NOT NULL,
    units_used DECIMAL(12,2) NOT NULL,
    reading_date DATE NOT NULL,
    recorded_by VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_water_usage (customer_id, reading_month, reading_year),
    CONSTRAINT fk_usage_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_usage_meter
        FOREIGN KEY (meter_id) REFERENCES meters(meter_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_usage_recorded_by
        FOREIGN KEY (recorded_by) REFERENCES app_users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CHECK (current_reading >= previous_reading),
    CHECK (units_used >= 0)
);

CREATE TABLE IF NOT EXISTS bills (
    bill_id VARCHAR(30) PRIMARY KEY,
    customer_id VARCHAR(30) NOT NULL,
    usage_id VARCHAR(30) NOT NULL UNIQUE,
    bill_month INT NOT NULL,
    bill_year INT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    water_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    sewer_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    meter_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    arrears_brought_forward DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    penalties DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    balance_due DECIMAL(12,2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bills (customer_id, bill_month, bill_year),
    CONSTRAINT fk_bills_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_bills_usage
        FOREIGN KEY (usage_id) REFERENCES water_usage(usage_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
    payment_id VARCHAR(30) PRIMARY KEY,
    bill_id VARCHAR(30) NOT NULL,
    customer_id VARCHAR(30) NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    transaction_reference VARCHAR(100),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    received_by VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_bill
        FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_payments_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_payments_received_by
        FOREIGN KEY (received_by) REFERENCES app_users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CHECK (amount_paid > 0)
);

CREATE TABLE IF NOT EXISTS leakage_reports (
    report_id VARCHAR(30) PRIMARY KEY,
    customer_id VARCHAR(30),
    branch_id VARCHAR(20) NOT NULL,
    report_title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location_description VARCHAR(255) NOT NULL,
    report_status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    CONSTRAINT fk_leak_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_leak_branch
        FOREIGN KEY (branch_id) REFERENCES branches(branch_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS bill_notifications (
    notification_id VARCHAR(30) PRIMARY KEY,
    bill_id VARCHAR(30) NOT NULL,
    customer_id VARCHAR(30) NOT NULL,
    notification_type VARCHAR(20) NOT NULL,
    notification_message TEXT NOT NULL,
    sent_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_bill
        FOREIGN KEY (bill_id) REFERENCES bills(bill_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_notifications_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_customers_account_number ON customers(account_number);
CREATE INDEX idx_water_usage_period ON water_usage(reading_year, reading_month);
CREATE INDEX idx_bills_period ON bills(bill_year, bill_month);
CREATE INDEX idx_bills_status ON bills(payment_status);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_leakage_status ON leakage_reports(report_status);
