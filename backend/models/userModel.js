
import db from "../config/db.js";

export async function findUserByEmail(email) {
  const [rows] = await db.execute(
    "SELECT id, full_name, email, password_hash, role, phone, created_at FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  return rows[0] || null;
}

export async function createUser({
  full_name,
  email,
  password_hash,
  role,
  phone,
}) {
  const [result] = await db.execute(
    `INSERT INTO users
      (full_name, email, password_hash, role, phone)
     VALUES (?, ?, ?, ?, ?)`,
    [full_name, email, password_hash, role, phone || null]
  );

  return {
    id: result.insertId,
    full_name,
    email,
    role,
    phone: phone || null,
  };
}
