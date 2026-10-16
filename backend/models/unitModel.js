
// import db from "../config/db.js";

// export async function createUnit({
//   property_id,
//   owner_id,
//   unit_name,
//   monthly_rent,
// }) {
//   const [result] = await db.execute(
//     `INSERT INTO units (property_id, unit_name, monthly_rent)
//      SELECT p.id, ?, ?
//      FROM properties p
//      WHERE p.id = ? AND p.owner_id = ?`,
//     [unit_name, monthly_rent, property_id, owner_id]
//   );

//   if (result.affectedRows === 0) {
//     return null;
//   }

//   return getUnitById(result.insertId, owner_id);
// }

// export async function getUnitById(id, owner_id) {
//   const [rows] = await db.execute(
//     `SELECT u.id, u.property_id, u.unit_name,
//             u.monthly_rent, u.status, u.created_at
//      FROM units u
//      INNER JOIN properties p ON p.id = u.property_id
//      WHERE u.id = ? AND p.owner_id = ?
//      LIMIT 1`,
//     [id, owner_id]
//   );

//   return rows[0] || null;
// }

// export async function getUnitsByProperty(property_id, owner_id) {
//   const [rows] = await db.execute(
//     `SELECT u.id, u.property_id, u.unit_name,
//             u.monthly_rent, u.status, u.created_at
//      FROM units u
//      INNER JOIN properties p ON p.id = u.property_id
//      WHERE u.property_id = ? AND p.owner_id = ?
//      ORDER BY u.created_at DESC`,
//     [property_id, owner_id]
//   );

//   return rows;
// }

// export async function updateUnit(id, owner_id, {
//   unit_name,
//   monthly_rent,
//   status,
// }) {
//   const [result] = await db.execute(
//     `UPDATE units u
//      INNER JOIN properties p ON p.id = u.property_id
//      SET u.unit_name = ?,
//          u.monthly_rent = ?,
//          u.status = ?
//      WHERE u.id = ? AND p.owner_id = ?`,
//     [unit_name, monthly_rent, status, id, owner_id]
//   );

//   if (result.affectedRows === 0) {
//     return null;
//   }

//   return getUnitById(id, owner_id);
// }

// export async function deleteUnit(id, owner_id) {
//   const [result] = await db.execute(
//     `DELETE u FROM units u
//      INNER JOIN properties p ON p.id = u.property_id
//      WHERE u.id = ? AND p.owner_id = ?`,
//     [id, owner_id]
//   );

//   return result.affectedRows > 0;
// }


import db from "../config/db.js";

export async function createUnit({
  property_id,
  owner_id,
  unit_name,
  monthly_rent,
}) {
  const [result] = await db.execute(
    `INSERT INTO units (property_id, unit_name, monthly_rent)
     SELECT p.id, ?, ?
     FROM properties p
     WHERE p.id = ? AND p.owner_id = ?`,
    [unit_name, monthly_rent, property_id, owner_id]
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getUnitById(result.insertId, owner_id);
}

export async function getUnitById(id, owner_id) {
  const [rows] = await db.execute(
    `SELECT u.id, u.property_id, u.unit_name,
            u.monthly_rent, u.status, u.created_at
     FROM units u
     INNER JOIN properties p ON p.id = u.property_id
     WHERE u.id = ? AND p.owner_id = ?
     LIMIT 1`,
    [id, owner_id]
  );

  return rows[0] || null;
}

export async function getUnitsByProperty(property_id, owner_id) {
  const [rows] = await db.execute(
    `SELECT u.id, u.property_id, u.unit_name,
            u.monthly_rent, u.status, u.created_at
     FROM units u
     INNER JOIN properties p ON p.id = u.property_id
     WHERE u.property_id = ? AND p.owner_id = ?
     ORDER BY u.created_at DESC`,
    [property_id, owner_id]
  );

  return rows;
}

export async function updateUnit(
  id,
  owner_id,
  { unit_name, monthly_rent, status }
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [units] = await connection.execute(
      `SELECT u.id, u.status
       FROM units u
       INNER JOIN properties p ON p.id = u.property_id
       WHERE u.id = ? AND p.owner_id = ?
       FOR UPDATE`,
      [id, owner_id]
    );

    if (units.length === 0) {
      await connection.rollback();
      return null;
    }

    const currentUnit = units[0];

    const [leases] = await connection.execute(
      `SELECT id, status
       FROM leases
       WHERE unit_id = ?
         AND status IN ('pending', 'active')
       FOR UPDATE`,
      [id]
    );

    const hasPendingLease = leases.some(
      (lease) => lease.status === "pending"
    );

    const hasActiveLease = leases.some(
      (lease) => lease.status === "active"
    );

    // Active leases must keep their units occupied.
    if (hasActiveLease && status !== "occupied") {
      const error = new Error(
        "This unit has an active lease. Its status must remain occupied."
      );
      error.code = "UNIT_HAS_ACTIVE_LEASE";
      throw error;
    }

    // A pending lease must not be disrupted by a manual status change.
    if (hasPendingLease && status !== currentUnit.status) {
      const error = new Error(
        "This unit has a pending lease. Resolve the lease before changing the unit status."
      );
      error.code = "UNIT_HAS_PENDING_LEASE";
      throw error;
    }

    // Only activating a lease should mark a unit occupied.
    if (status === "occupied" && !hasActiveLease) {
      const error = new Error(
        "A unit can only be marked occupied when it has an active lease."
      );
      error.code = "UNIT_MUST_BE_LEASE_ACTIVATED";
      throw error;
    }

    await connection.execute(
      `UPDATE units
       SET unit_name = ?,
           monthly_rent = ?,
           status = ?
       WHERE id = ?`,
      [unit_name, monthly_rent, status, id]
    );

    await connection.commit();

    return getUnitById(id, owner_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteUnit(id, owner_id) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [units] = await connection.execute(
      `SELECT u.id
       FROM units u
       INNER JOIN properties p ON p.id = u.property_id
       WHERE u.id = ? AND p.owner_id = ?
       FOR UPDATE`,
      [id, owner_id]
    );

    if (units.length === 0) {
      await connection.rollback();
      return false;
    }

    const [leases] = await connection.execute(
      `SELECT id
       FROM leases
       WHERE unit_id = ?
       LIMIT 1`,
      [id]
    );

    if (leases.length > 0) {
      const error = new Error(
        "This unit is linked to a lease and cannot be deleted."
      );
      error.code = "UNIT_HAS_LEASE";
      throw error;
    }

    await connection.execute(
      `DELETE FROM units WHERE id = ?`,
      [id]
    );

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
