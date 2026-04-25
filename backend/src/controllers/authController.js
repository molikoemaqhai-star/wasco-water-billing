import { pgPool } from "../config/db.js";
import { comparePassword } from "../utils/password.js";

export async function login(req, res, next) {
  try {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "").trim();

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required"
      });
    }

    const result = await pgPool.query(
      `
      SELECT
        u.user_id,
        u.branch_id,
        u.customer_id,
        u.full_name,
        u.username,
        u.email,
        u.password_hash,
        u.role,
        c.account_number,
        c.customer_type
      FROM app_users u
      LEFT JOIN customers c ON c.customer_id = u.customer_id
      WHERE LOWER(u.username) = LOWER($1)
      LIMIT 1
      `,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    const user = result.rows[0];

    const matches = await comparePassword(password, user.password_hash);

    if (!matches) {
      return res.status(401).json({
        message: "Invalid username or password"
      });
    }

    await pgPool.query(
      "UPDATE app_users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1",
      [user.user_id]
    );

    return res.json({
      message: "Login successful",
      user: {
        user_id: user.user_id,
        branch_id: user.branch_id,
        customer_id: user.customer_id,
        account_number: user.account_number,
        customer_type: user.customer_type,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
}