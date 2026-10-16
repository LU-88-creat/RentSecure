
import db from "../config/db.js";

export async function createTenant({
  landlord_id,
  user_id,
  national_id,
  emergency_contact,
}) {
  const [result] = await db.execute(
    `INSERT INTO tenants
      (landlord_id, user_id, national_id, emergency_contact)
     VALUES (?, ?, ?, ?)`,
    [
      landlord_id,
      user_id || null,
      national_id || null,
      emergency_contact || null,
    ]
  );

  return getTenantById(result.insertId, landlord_id);
}

export async function getTenantById(id, landlord_id) {
  const [rows] = await db.execute(
    `SELECT
       t.id,
       t.landlord_id,
       t.user_id,
       u.full_name,
       u.email,
       u.phone,
       t.national_id,
       t.emergency_contact,
       t.created_at
     FROM tenants t
     LEFT JOIN users u ON u.id = t.user_id
     WHERE t.id = ? AND t.landlord_id = ?
     LIMIT 1`,
    [id, landlord_id]
  );

  return rows[0] || null;
}

export async function getTenantsByLandlord(landlord_id) {
  const [rows] = await db.execute(
    `SELECT
       t.id,
       t.landlord_id,
       t.user_id,
       u.full_name,
       u.email,
       u.phone,
       t.national_id,
       t.emergency_contact,
       t.created_at
     FROM tenants t
     LEFT JOIN users u ON u.id = t.user_id
     WHERE t.landlord_id = ?
     ORDER BY t.created_at DESC`,
    [landlord_id]
  );

  return rows;
}

export async function updateTenant(
  id,
  landlord_id,
  { national_id, emergency_contact }
) {
  const [result] = await db.execute(
    `UPDATE tenants
     SET national_id = ?,
         emergency_contact = ?
     WHERE id = ? AND landlord_id = ?`,
    [
      national_id || null,
      emergency_contact || null,
      id,
      landlord_id,
    ]
  );

  if (result.affectedRows === 0) {
    const existingTenant = await getTenantById(id, landlord_id);
    if (!existingTenant) return null;
  }

  return getTenantById(id, landlord_id);
}

export async function deleteTenant(id, landlord_id) {
  const [result] = await db.execute(
    `DELETE FROM tenants
     WHERE id = ? AND landlord_id = ?`,
    [id, landlord_id]
  );

  return result.affectedRows > 0;
}
