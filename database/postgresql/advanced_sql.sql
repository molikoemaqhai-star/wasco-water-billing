-- =============================================================================
-- WASCO — PostgreSQL Advanced SQL Objects
-- Covers: Views, Stored Procedures, Triggers, Access Control (GRANT/REVOKE),
--         Embedded SQL patterns, TCL, Window Functions, OLAP (ROLLUP/CUBE)
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
    COALESCE(SUM(b.total_amount), 0)::NUMERIC(12,2)  AS total_billed,
    COALESCE(SUM(b.amount_paid), 0)::NUMERIC(12,2)   AS total_paid,
    COALESCE(SUM(b.balance_due), 0)::NUMERIC(12,2)   AS outstanding_balance,
    COUNT(b.bill_id)::INT                             AS total_bills,
    COUNT(CASE WHEN b.payment_status = 'UNPAID' THEN 1 END)::INT AS unpaid_bills
FROM customers c
LEFT JOIN bills b ON b.customer_id = c.customer_id
GROUP BY c.customer_id, c.account_number, c.first_name, c.last_name,
         c.customer_type, c.connection_status;

CREATE OR REPLACE VIEW vw_branch_manager_summary AS
SELECT
    br.branch_id,
    br.branch_name,
    d.district_name,
    COUNT(DISTINCT c.customer_id)::INT                AS total_customers,
    COALESCE(SUM(wu.units_used),  0)::NUMERIC(12,2)  AS total_units_used,
    COALESCE(SUM(b.total_amount), 0)::NUMERIC(12,2)  AS total_billed,
    COALESCE(SUM(p.amount_paid),  0)::NUMERIC(12,2)  AS total_collected,
    COALESCE(SUM(b.balance_due),  0)::NUMERIC(12,2)  AS total_outstanding
FROM branches br
JOIN districts d ON d.district_id = br.district_id
LEFT JOIN customers c      ON c.branch_id    = br.branch_id
LEFT JOIN water_usage wu   ON wu.customer_id = c.customer_id
LEFT JOIN bills b          ON b.customer_id  = c.customer_id
LEFT JOIN payments p       ON p.customer_id  = c.customer_id
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
  AND b.due_date < CURRENT_DATE
  AND b.payment_status != 'PAID';


-- =============================================================================
-- SECTION 2: STORED PROCEDURES / FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_calculate_water_charge(
    p_customer_type VARCHAR,
    p_units_used    NUMERIC
)
RETURNS TABLE (
    water_charge  NUMERIC,
    sewer_charge  NUMERIC,
    meter_charge  NUMERIC,
    tier_applied  VARCHAR
)
LANGUAGE plpgsql AS $$
DECLARE
    v_rate RECORD;
BEGIN
    SELECT br.cost_per_unit, br.sewer_charge, br.meter_charge, br.tier_name
    INTO v_rate
    FROM billing_rates br
    WHERE br.customer_type = p_customer_type
      AND br.is_active = TRUE
      AND br.min_units <= p_units_used
      AND (br.max_units IS NULL OR br.max_units >= p_units_used)
    ORDER BY br.min_units DESC
    LIMIT 1;

    IF NOT FOUND THEN
        SELECT br.cost_per_unit, br.sewer_charge, br.meter_charge, br.tier_name
        INTO v_rate
        FROM billing_rates br
        WHERE br.customer_type = p_customer_type AND br.is_active = TRUE
        ORDER BY br.min_units DESC LIMIT 1;
    END IF;

    RETURN QUERY SELECT
        (p_units_used * v_rate.cost_per_unit)::NUMERIC(12,2),
        v_rate.sewer_charge::NUMERIC(12,2),
        v_rate.meter_charge::NUMERIC(12,2),
        v_rate.tier_name;
END;
$$;

CREATE OR REPLACE FUNCTION fn_customer_outstanding_balance(
    p_account_number VARCHAR
)
RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE v_balance NUMERIC(12,2);
BEGIN
    SELECT COALESCE(SUM(balance_due), 0) INTO v_balance
    FROM bills b
    JOIN customers c ON c.customer_id = b.customer_id
    WHERE c.account_number = p_account_number AND b.balance_due > 0;
    RETURN v_balance;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_generate_bill(
    p_usage_id   VARCHAR,
    p_issue_date DATE DEFAULT CURRENT_DATE,
    p_due_date   DATE DEFAULT CURRENT_DATE + INTERVAL '30 days'
)
LANGUAGE plpgsql AS $$
DECLARE
    v_usage    RECORD;
    v_customer RECORD;
    v_charges  RECORD;
    v_arrears  NUMERIC(12,2) := 0;
    v_total    NUMERIC(12,2);
    v_bill_id  VARCHAR(30);
BEGIN
    SELECT wu.*, m.meter_number INTO v_usage
    FROM water_usage wu JOIN meters m ON m.meter_id = wu.meter_id
    WHERE wu.usage_id = p_usage_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Usage record % not found', p_usage_id; END IF;

    IF EXISTS (SELECT 1 FROM bills WHERE usage_id = p_usage_id) THEN
        RAISE EXCEPTION 'Bill already exists for usage_id %', p_usage_id;
    END IF;

    SELECT customer_id, customer_type INTO v_customer
    FROM customers WHERE customer_id = v_usage.customer_id;

    SELECT water_charge, sewer_charge, meter_charge INTO v_charges
    FROM fn_calculate_water_charge(v_customer.customer_type, v_usage.units_used);

    SELECT COALESCE(SUM(balance_due), 0) INTO v_arrears
    FROM bills
    WHERE customer_id = v_usage.customer_id AND balance_due > 0
      AND (bill_year < v_usage.reading_year
           OR (bill_year = v_usage.reading_year AND bill_month < v_usage.reading_month));

    v_total   := v_charges.water_charge + v_charges.sewer_charge + v_charges.meter_charge + v_arrears;
    v_bill_id := 'BILL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 10));

    INSERT INTO bills (
        bill_id, customer_id, usage_id, bill_month, bill_year,
        issue_date, due_date, water_charge, sewer_charge, meter_charge,
        arrears_brought_forward, total_amount, balance_due, payment_status
    ) VALUES (
        v_bill_id, v_usage.customer_id, p_usage_id,
        v_usage.reading_month, v_usage.reading_year,
        p_issue_date, p_due_date,
        v_charges.water_charge, v_charges.sewer_charge, v_charges.meter_charge,
        v_arrears, v_total, v_total, 'UNPAID'
    );

    RAISE NOTICE 'Bill % generated. Total: M%', v_bill_id, v_total;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_record_payment(
    p_payment_id  VARCHAR,
    p_bill_id     VARCHAR,
    p_customer_id VARCHAR,
    p_amount      NUMERIC,
    p_method      VARCHAR,
    p_reference   VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_bill        RECORD;
    v_new_paid    NUMERIC(12,2);
    v_new_balance NUMERIC(12,2);
    v_new_status  VARCHAR(20);
BEGIN
    SELECT total_amount, amount_paid, balance_due INTO v_bill
    FROM bills WHERE bill_id = p_bill_id AND customer_id = p_customer_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill % not found', p_bill_id; END IF;
    IF p_amount <= 0  THEN RAISE EXCEPTION 'Amount must be > 0'; END IF;

    v_new_paid    := v_bill.amount_paid + p_amount;
    v_new_balance := GREATEST(v_bill.total_amount - v_new_paid, 0);
    v_new_status  := CASE WHEN v_new_balance = 0 THEN 'PAID'
                          WHEN v_new_paid   > 0  THEN 'PARTIAL'
                          ELSE 'UNPAID' END;

    INSERT INTO payments (
        payment_id, bill_id, customer_id, payment_date,
        amount_paid, payment_method, transaction_reference, payment_status
    ) VALUES (
        p_payment_id, p_bill_id, p_customer_id, CURRENT_DATE,
        p_amount, p_method, p_reference, 'SUCCESS'
    );

    UPDATE bills
    SET amount_paid = v_new_paid, balance_due = v_new_balance, payment_status = v_new_status
    WHERE bill_id = p_bill_id;

    RAISE NOTICE 'Payment of M% recorded. New balance: M%. Status: %', p_amount, v_new_balance, v_new_status;
END;
$$;


-- =============================================================================
-- SECTION 3: TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION trg_fn_bill_notification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO bill_notifications (
        notification_id, bill_id, customer_id,
        notification_type, notification_message, sent_status, created_at
    )
    SELECT
        'NOTIF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 10)),
        NEW.bill_id, NEW.customer_id, 'BILL_GENERATED',
        'Your water bill for month ' || NEW.bill_month || '/' || NEW.bill_year ||
        ' is M ' || NEW.total_amount || '. Due: ' || NEW.due_date || '.',
        'PENDING', CURRENT_TIMESTAMP
    WHERE NOT EXISTS (
        SELECT 1 FROM bill_notifications
        WHERE bill_id = NEW.bill_id AND notification_type = 'BILL_GENERATED'
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bill_notification ON bills;
CREATE TRIGGER trg_bill_notification
AFTER INSERT ON bills
FOR EACH ROW EXECUTE FUNCTION trg_fn_bill_notification();

CREATE OR REPLACE FUNCTION trg_fn_overdue_notification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.balance_due > 0
       AND NEW.due_date < CURRENT_DATE
       AND NEW.payment_status IN ('UNPAID', 'PARTIAL')
       AND (OLD.payment_status != NEW.payment_status OR OLD.balance_due != NEW.balance_due)
    THEN
        INSERT INTO bill_notifications (
            notification_id, bill_id, customer_id,
            notification_type, notification_message, sent_status, created_at
        )
        SELECT
            'NOTIF-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 10)),
            NEW.bill_id, NEW.customer_id, 'OVERDUE_REMINDER',
            'OVERDUE: Your balance of M ' || NEW.balance_due ||
            ' for ' || NEW.bill_month || '/' || NEW.bill_year ||
            ' is past due. Pay now to avoid disconnection.',
            'PENDING', CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
            SELECT 1 FROM bill_notifications
            WHERE bill_id = NEW.bill_id AND notification_type = 'OVERDUE_REMINDER'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_overdue_notification ON bills;
CREATE TRIGGER trg_overdue_notification
AFTER UPDATE ON bills
FOR EACH ROW EXECUTE FUNCTION trg_fn_overdue_notification();

CREATE OR REPLACE FUNCTION trg_fn_update_meter_reading()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE meters
    SET last_reading = NEW.current_reading
    WHERE meter_id = NEW.meter_id AND last_reading < NEW.current_reading;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_meter_reading ON water_usage;
CREATE TRIGGER trg_update_meter_reading
AFTER INSERT ON water_usage
FOR EACH ROW EXECUTE FUNCTION trg_fn_update_meter_reading();


-- =============================================================================
-- SECTION 4: ACCESS CONTROL (GRANT / REVOKE)
-- =============================================================================

CREATE ROLE wasco_admin    LOGIN PASSWORD 'wasco_admin_2025';
CREATE ROLE wasco_app      LOGIN PASSWORD 'wasco_app_2025';
CREATE ROLE wasco_readonly LOGIN PASSWORD 'wasco_readonly_2025';

GRANT CONNECT ON DATABASE wasco_water_billing TO wasco_app;
GRANT USAGE   ON SCHEMA public TO wasco_app;
GRANT SELECT, INSERT, UPDATE, DELETE
    ON customers, app_users, billing_rates, meters, water_usage,
       bills, payments, leakage_reports, bill_notifications, branches, districts
    TO wasco_app;
GRANT SELECT ON vw_customer_balances, vw_branch_manager_summary,
               vw_bill_detail, vw_payment_history, vw_overdue_bills
    TO wasco_app;
GRANT EXECUTE ON FUNCTION  fn_calculate_water_charge(VARCHAR, NUMERIC) TO wasco_app;
GRANT EXECUTE ON FUNCTION  fn_customer_outstanding_balance(VARCHAR)     TO wasco_app;
GRANT EXECUTE ON PROCEDURE sp_generate_bill(VARCHAR, DATE, DATE)        TO wasco_app;
GRANT EXECUTE ON PROCEDURE sp_record_payment(VARCHAR,VARCHAR,VARCHAR,NUMERIC,VARCHAR,VARCHAR) TO wasco_app;

GRANT CONNECT ON DATABASE wasco_water_billing TO wasco_readonly;
GRANT USAGE   ON SCHEMA public TO wasco_readonly;
GRANT SELECT  ON customers, billing_rates, water_usage, bills, payments,
                 leakage_reports, bill_notifications, branches, districts
    TO wasco_readonly;
GRANT SELECT  ON vw_customer_balances, vw_branch_manager_summary,
                 vw_bill_detail, vw_payment_history, vw_overdue_bills
    TO wasco_readonly;

GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO wasco_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wasco_admin;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL    ON bills, payments, customers FROM PUBLIC;


-- =============================================================================
-- SECTION 5: ADVANCED QUERIES (Window Functions / OLAP)
-- =============================================================================

SELECT * FROM vw_customer_balances ORDER BY outstanding_balance DESC;

SELECT * FROM vw_branch_manager_summary ORDER BY branch_name;

SELECT c.customer_type, wu.reading_year, wu.reading_month,
       SUM(wu.units_used)::NUMERIC(12,2) AS units_used
FROM customers c JOIN water_usage wu ON wu.customer_id = c.customer_id
GROUP BY c.customer_type, wu.reading_year, wu.reading_month
ORDER BY wu.reading_year DESC, wu.reading_month DESC, c.customer_type;

SELECT
    c.account_number,
    c.first_name || ' ' || c.last_name AS customer_name,
    br.branch_name,
    SUM(wu.units_used)                 AS total_units,
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
    COUNT(*)::INT                    AS bills_count,
    SUM(total_amount)::NUMERIC(12,2) AS total_billed,
    SUM(amount_paid)::NUMERIC(12,2)  AS total_collected,
    SUM(balance_due)::NUMERIC(12,2)  AS total_outstanding
FROM bills
GROUP BY ROLLUP(bill_year, bill_month)
ORDER BY bill_year NULLS LAST, bill_month NULLS LAST;

SELECT
    payment_date,
    SUM(amount_paid)::NUMERIC(12,2)                                    AS daily_revenue,
    SUM(SUM(amount_paid)) OVER (ORDER BY payment_date)::NUMERIC(12,2)  AS cumulative_revenue
FROM payments WHERE payment_status = 'SUCCESS'
GROUP BY payment_date ORDER BY payment_date;

SELECT
    c.account_number,
    c.first_name || ' ' || c.last_name AS customer_name,
    COUNT(b.bill_id)                    AS total_bills,
    SUM(CASE WHEN b.payment_status='PAID'    THEN 1 ELSE 0 END) AS paid,
    SUM(CASE WHEN b.payment_status='UNPAID'  THEN 1 ELSE 0 END) AS unpaid,
    ROUND(100.0 * SUM(CASE WHEN b.payment_status='PAID' THEN 1 ELSE 0 END)
          / NULLIF(COUNT(b.bill_id),0), 1) AS payment_rate_pct
FROM customers c
LEFT JOIN bills b ON b.customer_id = c.customer_id
GROUP BY c.account_number, c.first_name, c.last_name
ORDER BY payment_rate_pct ASC NULLS LAST;