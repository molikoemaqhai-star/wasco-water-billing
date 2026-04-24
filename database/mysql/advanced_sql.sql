-- =============================================================================
-- WASCO — MySQL Advanced SQL Objects
-- Covers: Views, Stored Procedures, Triggers, Access Control (GRANT/REVOKE),
--         Window Functions, OLAP (ROLLUP)
-- =============================================================================


-- =============================================================================
-- SECTION 1: VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW vw_customer_balances AS
SELECT
    c.customer_id,
    c.account_number,
    c.first_name,
    c.last_name,
    c.customer_type,
    c.connection_status,
    COALESCE(SUM(b.total_amount), 0) AS total_billed,
    COALESCE(SUM(b.amount_paid),  0) AS total_paid,
    COALESCE(SUM(b.balance_due),  0) AS outstanding_balance,
    COUNT(b.bill_id)                 AS total_bills,
    SUM(CASE WHEN b.payment_status = 'UNPAID' THEN 1 ELSE 0 END) AS unpaid_bills
FROM customers c
LEFT JOIN bills b ON b.customer_id = c.customer_id
GROUP BY c.customer_id, c.account_number, c.first_name, c.last_name,
         c.customer_type, c.connection_status;

CREATE OR REPLACE VIEW vw_branch_manager_summary AS
SELECT
    br.branch_id,
    br.branch_name,
    d.district_name,
    COUNT(DISTINCT c.customer_id)    AS total_customers,
    COALESCE(SUM(wu.units_used),  0) AS total_units_used,
    COALESCE(SUM(b.total_amount), 0) AS total_billed,
    COALESCE(SUM(p.amount_paid),  0) AS total_collected,
    COALESCE(SUM(b.balance_due),  0) AS total_outstanding
FROM branches br
JOIN districts d ON d.district_id = br.district_id
LEFT JOIN customers c    ON c.branch_id    = br.branch_id
LEFT JOIN water_usage wu ON wu.customer_id = c.customer_id
LEFT JOIN bills b        ON b.customer_id  = c.customer_id
LEFT JOIN payments p     ON p.customer_id  = c.customer_id
GROUP BY br.branch_id, br.branch_name, d.district_name;

CREATE OR REPLACE VIEW vw_bill_detail AS
SELECT
    b.bill_id, b.bill_month, b.bill_year, b.issue_date, b.due_date,
    b.total_amount, b.amount_paid, b.balance_due, b.payment_status,
    c.account_number, c.first_name, c.last_name, c.customer_type,
    br.branch_name, wu.units_used, wu.reading_date
FROM bills b
JOIN customers c    ON c.customer_id = b.customer_id
JOIN branches br    ON br.branch_id  = c.branch_id
JOIN water_usage wu ON wu.usage_id   = b.usage_id;

CREATE OR REPLACE VIEW vw_payment_history AS
SELECT
    p.payment_id, p.payment_date, p.amount_paid, p.payment_method,
    p.transaction_reference, p.payment_status,
    c.account_number, c.first_name, c.last_name,
    b.bill_month, b.bill_year, b.total_amount AS bill_total
FROM payments p
JOIN customers c ON c.customer_id = p.customer_id
JOIN bills b     ON b.bill_id     = p.bill_id;

CREATE OR REPLACE VIEW vw_overdue_bills AS
SELECT
    b.bill_id, b.due_date, b.balance_due, b.payment_status,
    c.account_number, c.first_name, c.last_name, c.phone, c.email,
    br.branch_name
FROM bills b
JOIN customers c ON c.customer_id = b.customer_id
JOIN branches br ON br.branch_id  = c.branch_id
WHERE b.balance_due > 0
  AND b.due_date < CURDATE()
  AND b.payment_status != 'PAID';


-- =============================================================================
-- SECTION 2: STORED PROCEDURES
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_generate_bill;
DELIMITER $$

CREATE PROCEDURE sp_generate_bill(
    IN  p_usage_id   VARCHAR(30),
    IN  p_issue_date DATE,
    IN  p_due_date   DATE
)
BEGIN
    DECLARE v_customer_id   VARCHAR(30);
    DECLARE v_customer_type VARCHAR(20);
    DECLARE v_units_used    DECIMAL(12,2);
    DECLARE v_reading_month INT;
    DECLARE v_reading_year  INT;
    DECLARE v_cost_per_unit DECIMAL(10,2);
    DECLARE v_sewer_charge  DECIMAL(10,2);
    DECLARE v_meter_charge  DECIMAL(10,2);
    DECLARE v_arrears       DECIMAL(12,2) DEFAULT 0;
    DECLARE v_water_charge  DECIMAL(12,2);
    DECLARE v_total         DECIMAL(12,2);
    DECLARE v_bill_id       VARCHAR(30);
    DECLARE v_notif_id      VARCHAR(30);

    SELECT wu.customer_id, wu.units_used, wu.reading_month, wu.reading_year
    INTO v_customer_id, v_units_used, v_reading_month, v_reading_year
    FROM water_usage wu WHERE wu.usage_id = p_usage_id LIMIT 1;

    IF v_customer_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Usage record not found';
    END IF;

    IF EXISTS (SELECT 1 FROM bills WHERE usage_id = p_usage_id) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Bill already exists for this usage record';
    END IF;

    SELECT customer_type INTO v_customer_type
    FROM customers WHERE customer_id = v_customer_id;

    SELECT cost_per_unit, sewer_charge, meter_charge
    INTO v_cost_per_unit, v_sewer_charge, v_meter_charge
    FROM billing_rates
    WHERE customer_type = v_customer_type
      AND is_active = TRUE
      AND min_units <= v_units_used
      AND (max_units IS NULL OR max_units >= v_units_used)
    ORDER BY min_units DESC LIMIT 1;

    SELECT COALESCE(SUM(balance_due), 0)
    INTO v_arrears
    FROM bills
    WHERE customer_id = v_customer_id AND balance_due > 0
      AND (bill_year < v_reading_year
           OR (bill_year = v_reading_year AND bill_month < v_reading_month));

    SET v_water_charge = v_units_used * v_cost_per_unit;
    SET v_total        = v_water_charge + v_sewer_charge + v_meter_charge + v_arrears;
    SET v_bill_id      = CONCAT('BILL-', UPPER(SUBSTR(MD5(RAND()), 1, 10)));
    SET v_notif_id     = CONCAT('NOTIF-', UPPER(SUBSTR(MD5(RAND()), 1, 10)));

    START TRANSACTION;

    INSERT INTO bills (
        bill_id, customer_id, usage_id, bill_month, bill_year,
        issue_date, due_date, water_charge, sewer_charge, meter_charge,
        arrears_brought_forward, total_amount, balance_due, payment_status
    ) VALUES (
        v_bill_id, v_customer_id, p_usage_id, v_reading_month, v_reading_year,
        p_issue_date, p_due_date, v_water_charge, v_sewer_charge, v_meter_charge,
        v_arrears, v_total, v_total, 'UNPAID'
    );

    INSERT INTO bill_notifications (
        notification_id, bill_id, customer_id,
        notification_type, notification_message, sent_status
    ) VALUES (
        v_notif_id, v_bill_id, v_customer_id,
        'BILL_GENERATED',
        CONCAT('Your water bill for ', v_reading_month, '/', v_reading_year,
               ' is M ', v_total, '. Due: ', p_due_date, '.'),
        'PENDING'
    );

    COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_record_payment$$

CREATE PROCEDURE sp_record_payment(
    IN p_payment_id  VARCHAR(30),
    IN p_bill_id     VARCHAR(30),
    IN p_customer_id VARCHAR(30),
    IN p_amount      DECIMAL(12,2),
    IN p_method      VARCHAR(30),
    IN p_reference   VARCHAR(100)
)
BEGIN
    DECLARE v_total_amount DECIMAL(12,2);
    DECLARE v_amount_paid  DECIMAL(12,2);
    DECLARE v_new_paid     DECIMAL(12,2);
    DECLARE v_new_balance  DECIMAL(12,2);
    DECLARE v_new_status   VARCHAR(20);

    SELECT total_amount, amount_paid INTO v_total_amount, v_amount_paid
    FROM bills WHERE bill_id = p_bill_id AND customer_id = p_customer_id;

    IF v_total_amount IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bill not found';
    END IF;
    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Amount must be > 0';
    END IF;

    SET v_new_paid    = v_amount_paid + p_amount;
    SET v_new_balance = GREATEST(v_total_amount - v_new_paid, 0);
    SET v_new_status  = CASE
        WHEN v_new_balance = 0 THEN 'PAID'
        WHEN v_new_paid > 0   THEN 'PARTIAL'
        ELSE 'UNPAID'
    END;

    START TRANSACTION;

    INSERT INTO payments (
        payment_id, bill_id, customer_id, payment_date,
        amount_paid, payment_method, transaction_reference, payment_status
    ) VALUES (
        p_payment_id, p_bill_id, p_customer_id, CURDATE(),
        p_amount, p_method, p_reference, 'SUCCESS'
    );

    UPDATE bills
    SET amount_paid = v_new_paid, balance_due = v_new_balance, payment_status = v_new_status
    WHERE bill_id = p_bill_id;

    COMMIT;
END$$

DELIMITER ;


-- =============================================================================
-- SECTION 3: TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS trg_bill_notification;
DELIMITER $$
CREATE TRIGGER trg_bill_notification
AFTER INSERT ON bills
FOR EACH ROW
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM bill_notifications
        WHERE bill_id = NEW.bill_id AND notification_type = 'BILL_GENERATED'
    ) THEN
        INSERT INTO bill_notifications (
            notification_id, bill_id, customer_id,
            notification_type, notification_message, sent_status, created_at
        ) VALUES (
            CONCAT('NOTIF-', UPPER(SUBSTR(MD5(RAND()), 1, 10))),
            NEW.bill_id, NEW.customer_id, 'BILL_GENERATED',
            CONCAT('Your bill for ', NEW.bill_month, '/', NEW.bill_year,
                   ' is M ', NEW.total_amount, '. Due: ', NEW.due_date, '.'),
            'PENDING', NOW()
        );
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_update_meter_reading$$
CREATE TRIGGER trg_update_meter_reading
AFTER INSERT ON water_usage
FOR EACH ROW
BEGIN
    UPDATE meters
    SET last_reading = NEW.current_reading
    WHERE meter_id = NEW.meter_id AND last_reading < NEW.current_reading;
END$$

DELIMITER ;


-- =============================================================================
-- SECTION 4: ACCESS CONTROL (GRANT / REVOKE)
-- =============================================================================

CREATE USER IF NOT EXISTS 'wasco_app'@'%'      IDENTIFIED BY 'wasco_app_2025';
CREATE USER IF NOT EXISTS 'wasco_readonly'@'%' IDENTIFIED BY 'wasco_readonly_2025';
CREATE USER IF NOT EXISTS 'wasco_admin'@'%'    IDENTIFIED BY 'wasco_admin_2025';

GRANT SELECT, INSERT, UPDATE, DELETE
    ON wasco_water_billing.* TO 'wasco_app'@'%';
GRANT EXECUTE ON PROCEDURE wasco_water_billing.sp_generate_bill  TO 'wasco_app'@'%';
GRANT EXECUTE ON PROCEDURE wasco_water_billing.sp_record_payment TO 'wasco_app'@'%';

GRANT SELECT ON wasco_water_billing.* TO 'wasco_readonly'@'%';

GRANT ALL PRIVILEGES ON wasco_water_billing.* TO 'wasco_admin'@'%';

REVOKE DROP, ALTER ON wasco_water_billing.* FROM 'wasco_app'@'%';

FLUSH PRIVILEGES;


-- =============================================================================
-- SECTION 5: ADVANCED QUERIES (Window Functions / OLAP)
-- =============================================================================

SELECT * FROM vw_customer_balances ORDER BY outstanding_balance DESC;

SELECT * FROM vw_branch_manager_summary ORDER BY branch_name;

SELECT c.customer_type, wu.reading_year, wu.reading_month,
       SUM(wu.units_used) AS units_used
FROM customers c JOIN water_usage wu ON wu.customer_id = c.customer_id
GROUP BY c.customer_type, wu.reading_year, wu.reading_month
ORDER BY wu.reading_year DESC, wu.reading_month DESC, c.customer_type;

SELECT
    c.account_number,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    br.branch_name,
    SUM(wu.units_used) AS total_units,
    RANK() OVER (
        PARTITION BY c.branch_id
        ORDER BY SUM(wu.units_used) DESC
    ) AS branch_rank
FROM customers c
JOIN water_usage wu ON wu.customer_id = c.customer_id
JOIN branches br    ON br.branch_id   = c.branch_id
GROUP BY c.account_number, c.first_name, c.last_name, c.branch_id, br.branch_name
ORDER BY br.branch_name, branch_rank;

SELECT
    bill_year, bill_month,
    COUNT(*)          AS bills_count,
    SUM(total_amount) AS total_billed,
    SUM(amount_paid)  AS total_collected,
    SUM(balance_due)  AS total_outstanding
FROM bills
GROUP BY bill_year, bill_month WITH ROLLUP
ORDER BY bill_year IS NULL, bill_year, bill_month IS NULL, bill_month;

SELECT
    payment_date,
    SUM(amount_paid) AS daily_revenue,
    SUM(SUM(amount_paid)) OVER (ORDER BY payment_date) AS cumulative_revenue
FROM payments WHERE payment_status = 'SUCCESS'
GROUP BY payment_date ORDER BY payment_date;

SELECT
    c.account_number,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    COUNT(b.bill_id) AS total_bills,
    SUM(CASE WHEN b.payment_status='PAID'    THEN 1 ELSE 0 END) AS paid,
    SUM(CASE WHEN b.payment_status='UNPAID'  THEN 1 ELSE 0 END) AS unpaid,
    ROUND(100.0 * SUM(CASE WHEN b.payment_status='PAID' THEN 1 ELSE 0 END)
          / NULLIF(COUNT(b.bill_id),0), 1) AS payment_rate_pct
FROM customers c
LEFT JOIN bills b ON b.customer_id = c.customer_id
GROUP BY c.account_number, c.first_name, c.last_name
ORDER BY payment_rate_pct ASC;