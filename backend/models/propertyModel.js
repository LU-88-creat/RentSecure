
import db from "../config/db.js";

export async function createProperty({
  owner_id,
  property_name,
  property_type,
  address,
  city,
  description,
}) {
  const [result] = await db.execute(
    `INSERT INTO properties
      (owner_id, property_name, property_type, address, city, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      owner_id,
      property_name,
      property_type,
      address,
      city || null,
      description || null,
    ]
  );

  return getPropertyById(result.insertId, owner_id);
}

export async function getPropertyById(id, owner_id) {
  const [rows] = await db.execute(
    `SELECT id, owner_id, property_name, property_type,
            address, city, description, created_at
     FROM properties
     WHERE id = ? AND owner_id = ?
     LIMIT 1`,
    [id, owner_id]
  );

  return rows[0] || null;
}

export async function getPropertiesByOwner(owner_id) {
  const [rows] = await db.execute(
    `SELECT id, owner_id, property_name, property_type,
            address, city, description, created_at
     FROM properties
     WHERE owner_id = ?
     ORDER BY created_at DESC`,
    [owner_id]
  );

  return rows;
}

export async function updateProperty(id, owner_id, property) {
  const {
    property_name,
    property_type,
    address,
    city,
    description,
  } = property;

  const [result] = await db.execute(
    `UPDATE properties
     SET property_name = ?,
         property_type = ?,
         address = ?,
         city = ?,
         description = ?
     WHERE id = ? AND owner_id = ?`,
    [
      property_name,
      property_type,
      address,
      city || null,
      description || null,
      id,
      owner_id,
    ]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getPropertyById(id, owner_id);
}

export async function deleteProperty(id, owner_id) {
  const [result] = await db.execute(
    "DELETE FROM properties WHERE id = ? AND owner_id = ?",
    [id, owner_id]
  );

  return result.affectedRows > 0;
}
