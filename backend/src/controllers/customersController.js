import { pgPool } from "../config/db.js";
import { makeId } from "../utils/id.js";

export async function getCustomers(req, res, next) {
  try {
    const result = await pgPool.query(`
      SELECT c.*, b.branch_name
      FROM customers c
      JOIN branches b ON b.branch_id = c.branch_id
      ORDER BY c.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const customer = {
      customer_id: makeId("CUS"),
      branch_id: req.body.branch_id,
      account_number: req.body.account_number,
      customer_type: req.body.customer_type || "RESIDENTIAL",
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone: req.body.phone || null,
      email: req.body.email || null,
      national_id: req.body.national_id || null,
      address_line1: req.body.address_line1 || null,
      address_line2: req.body.address_line2 || null,
      district: req.body.district || null,
      village_town: req.body.village_town || null,
      connection_status: req.body.connection_status || "ACTIVE"
    };

    await pgPool.query(
      `
      INSERT INTO customers (
        customer_id,
        branch_id,
        account_number,
        customer_type,
        first_name,
        last_name,
        phone,
        email,
        national_id,
        address_line1,
        address_line2,
        district,
        village_town,
        connection_status,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      `,
      [
        customer.customer_id,
        customer.branch_id,
        customer.account_number,
        customer.customer_type,
        customer.first_name,
        customer.last_name,
        customer.phone,
        customer.email,
        customer.national_id,
        customer.address_line1,
        customer.address_line2,
        customer.district,
        customer.village_town,
        customer.connection_status
      ]
    );

    res.status(201).json({
      message: "Customer created successfully",
      customer
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const payload = {
      branch_id: req.body.branch_id,
      account_number: req.body.account_number,
      customer_type: req.body.customer_type || "RESIDENTIAL",
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone: req.body.phone || null,
      email: req.body.email || null,
      national_id: req.body.national_id || null,
      address_line1: req.body.address_line1 || null,
      address_line2: req.body.address_line2 || null,
      district: req.body.district || null,
      village_town: req.body.village_town || null,
      connection_status: req.body.connection_status || "ACTIVE"
    };

    await pgPool.query(
      `
      UPDATE customers
      SET
        branch_id = $1,
        account_number = $2,
        customer_type = $3,
        first_name = $4,
        last_name = $5,
        phone = $6,
        email = $7,
        national_id = $8,
        address_line1 = $9,
        address_line2 = $10,
        district = $11,
        village_town = $12,
        connection_status = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $14
      `,
      [
        payload.branch_id,
        payload.account_number,
        payload.customer_type,
        payload.first_name,
        payload.last_name,
        payload.phone,
        payload.email,
        payload.national_id,
        payload.address_line1,
        payload.address_line2,
        payload.district,
        payload.village_town,
        payload.connection_status,
        req.params.id
      ]
    );

    res.json({ message: "Customer updated successfully" });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req, res, next) {
  try {
    await pgPool.query(
      "DELETE FROM customers WHERE customer_id = $1",
      [req.params.id]
    );

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    next(error);
  }
}