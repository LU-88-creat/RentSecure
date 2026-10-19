
// import db from "../config/db.js";

// export async function createLease({
//   owner_id,
//   unit_id,
//   tenant_id,
//   start_date,
//   end_date,
//   monthly_rent,
//   deposit_amount,
// }) {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     // Lock and verify the unit belongs to this landlord.
//     const [units] = await connection.execute(
//       `SELECT u.id, u.status
//        FROM units u
//        INNER JOIN properties p ON p.id = u.property_id
//        WHERE u.id = ? AND p.owner_id = ?
//        FOR UPDATE`,
//       [unit_id, owner_id]
//     );

//     if (units.length === 0 || units[0].status !== "available") {
//       await connection.rollback();
//       return null;
//     }

//     // Verify the tenant belongs to this landlord.
//     const [tenants] = await connection.execute(
//       `SELECT id FROM tenants
//        WHERE id = ? AND landlord_id = ?
//        LIMIT 1`,
//       [tenant_id, owner_id]
//     );

//     if (tenants.length === 0) {
//       await connection.rollback();
//       return null;
//     }

//     // Prevent multiple pending or active leases for one unit.
//     const [existingLeases] = await connection.execute(
//       `SELECT id FROM leases
//        WHERE unit_id = ?
//          AND status IN ('pending', 'active')
//        LIMIT 1`,
//       [unit_id]
//     );

//     if (existingLeases.length > 0) {
//       await connection.rollback();
//       return null;
//     }

//     const [result] = await connection.execute(
//       `INSERT INTO leases
//         (unit_id, tenant_id, start_date, end_date,
//          monthly_rent, deposit_amount, status)
//        VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
//       [
//         unit_id,
//         tenant_id,
//         start_date,
//         end_date || null,
//         monthly_rent,
//         deposit_amount ?? 0,
//       ]
//     );

//     await connection.commit();

//     return getLeaseById(result.insertId, owner_id);
//   } catch (error) {
//     await connection.rollback();
//     throw error;
//   } finally {
//     connection.release();
//   }
// }

// export async function getLeaseById(id, owner_id) {
//   const [rows] = await db.execute(
//     `SELECT
//        l.id,
//        l.unit_id,
//        u.unit_name,
//        p.id AS property_id,
//        p.property_name,
//        l.tenant_id,
//        usr.full_name AS tenant_name,
//        usr.email AS tenant_email,
//        l.start_date,
//        l.end_date,
//        l.monthly_rent,
//        l.deposit_amount,
//        l.status,
//        l.created_at
//      FROM leases l
//      INNER JOIN units u ON u.id = l.unit_id
//      INNER JOIN properties p ON p.id = u.property_id
//      INNER JOIN tenants t ON t.id = l.tenant_id
//      LEFT JOIN users usr ON usr.id = t.user_id
//      WHERE l.id = ?
//        AND p.owner_id = ?
//        AND t.landlord_id = ?
//      LIMIT 1`,
//     [id, owner_id, owner_id]
//   );

//   return rows[0] || null;
// }

// export async function getLeasesByLandlord(owner_id) {
//   const [rows] = await db.execute(
//     `SELECT
//        l.id,
//        l.unit_id,
//        u.unit_name,
//        p.id AS property_id,
//        p.property_name,
//        l.tenant_id,
//        usr.full_name AS tenant_name,
//        usr.email AS tenant_email,
//        l.start_date,
//        l.end_date,
//        l.monthly_rent,
//        l.deposit_amount,
//        l.status,
//        l.created_at
//      FROM leases l
//      INNER JOIN units u ON u.id = l.unit_id
//      INNER JOIN properties p ON p.id = u.property_id
//      INNER JOIN tenants t ON t.id = l.tenant_id
//      LEFT JOIN users usr ON usr.id = t.user_id
//      WHERE p.owner_id = ?
//        AND t.landlord_id = ?
//      ORDER BY l.created_at DESC`,
//     [owner_id, owner_id]
//   );

//   return rows;
// }

// export async function updateLease(id, owner_id, {
//   start_date,
//   end_date,
//   monthly_rent,
//   deposit_amount,
//   status,
// }) {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     // Lock the lease and its unit while checking status changes.
//     const [leases] = await connection.execute(
//       `SELECT l.id, l.unit_id, l.status AS lease_status,
//               u.status AS unit_status
//        FROM leases l
//        INNER JOIN units u ON u.id = l.unit_id
//        INNER JOIN properties p ON p.id = u.property_id
//        INNER JOIN tenants t ON t.id = l.tenant_id
//        WHERE l.id = ?
//          AND p.owner_id = ?
//          AND t.landlord_id = ?
//        FOR UPDATE`,
//       [id, owner_id, owner_id]
//     );

//     if (leases.length === 0) {
//       await connection.rollback();
//       return null;
//     }

//     const lease = leases[0];

//     // An active lease requires a unit that is not under maintenance.
//     if (status === "active") {
//       if (lease.unit_status === "maintenance") {
//         const error = new Error(
//           "A unit under maintenance cannot have an active lease."
//         );
//         error.code = "UNIT_MAINTENANCE";
//         throw error;
//       }

//       const [otherLeases] = await connection.execute(
//         `SELECT id FROM leases
//          WHERE unit_id = ?
//            AND id <> ?
//            AND status IN ('pending', 'active')
//          LIMIT 1`,
//         [lease.unit_id, id]
//       );

//       if (otherLeases.length > 0) {
//         const error = new Error(
//           "This unit already has another pending or active lease."
//         );
//         error.code = "UNIT_HAS_LEASE";
//         throw error;
//       }
//     }

//     await connection.execute(
//       `UPDATE leases
//        SET start_date = ?,
//            end_date = ?,
//            monthly_rent = ?,
//            deposit_amount = ?,
//            status = ?
//        WHERE id = ?`,
//       [
//         start_date,
//         end_date || null,
//         monthly_rent,
//         deposit_amount ?? 0,
//         status,
//         id,
//       ]
//     );

//     // Synchronize unit status with the resulting lease status.
//     if (lease.unit_status !== "maintenance") {
//       if (status === "active") {
//         await connection.execute(
//           `UPDATE units SET status = 'occupied' WHERE id = ?`,
//           [lease.unit_id]
//         );
//       } else {
//         const [activeLeases] = await connection.execute(
//           `SELECT id FROM leases
//            WHERE unit_id = ?
//              AND status = 'active'
//            LIMIT 1`,
//           [lease.unit_id]
//         );

//         await connection.execute(
//           `UPDATE units SET status = ?
//            WHERE id = ?`,
//           [
//             activeLeases.length > 0 ? "occupied" : "available",
//             lease.unit_id,
//           ]
//         );
//       }
//     }

//     await connection.commit();

//     return getLeaseById(id, owner_id);
//   } catch (error) {
//     await connection.rollback();
//     throw error;
//   } finally {
//     connection.release();
//   }
// }

// export async function deleteLease(id, owner_id) {
//   const connection = await db.getConnection();

//   try {
//     await connection.beginTransaction();

//     const [leases] = await connection.execute(
//       `SELECT l.id, l.unit_id, u.status AS unit_status
//        FROM leases l
//        INNER JOIN units u ON u.id = l.unit_id
//        INNER JOIN properties p ON p.id = u.property_id
//        INNER JOIN tenants t ON t.id = l.tenant_id
//        WHERE l.id = ?
//          AND p.owner_id = ?
//          AND t.landlord_id = ?
//        FOR UPDATE`,
//       [id, owner_id, owner_id]
//     );

//     if (leases.length === 0) {
//       await connection.rollback();
//       return false;
//     }

//     const lease = leases[0];

//     await connection.execute(
//       `DELETE FROM leases WHERE id = ?`,
//       [id]
//     );

//     // If no active lease remains, release the unit unless
//     // it is under maintenance.
//     if (lease.unit_status !== "maintenance") {
//       const [activeLeases] = await connection.execute(
//         `SELECT id FROM leases
//          WHERE unit_id = ? AND status = 'active'
//          LIMIT 1`,
//         [lease.unit_id]
//       );

//       await connection.execute(
//         `UPDATE units SET status = ?
//          WHERE id = ?`,
//         [
//           activeLeases.length > 0 ? "occupied" : "available",
//           lease.unit_id,
//         ]
//       );
//     }

//     await connection.commit();
//     return true;
//   } catch (error) {
//     await connection.rollback();
//     throw error;
//   } finally {
//     connection.release();
//   }
// }


import db from "../config/db.js";

const VALID_LEASE_STATUSES = [
  "pending",
  "active",
  "ended",
  "terminated",
];

async function lockUnit(connection, unitId) {
  const [rows] = await connection.execute(
    `SELECT id, status
     FROM units
     WHERE id = ?
     FOR UPDATE`,
    [unitId]
  );

  return rows[0] || null;
}

async function getOutstandingLeases(connection, unitId, excludeLeaseId = null) {
  const [rows] = await connection.execute(
    `SELECT id, status
     FROM leases
     WHERE unit_id = ?
       AND status IN ('pending', 'active')
       AND (? IS NULL OR id <> ?)
     FOR UPDATE`,
    [unitId, excludeLeaseId, excludeLeaseId]
  );

  return rows;
}

async function syncUnitStatus(connection, unitId) {
  // The caller must lock the unit before changing its status.
  const [units] = await connection.execute(
    `SELECT id, status
     FROM units
     WHERE id = ?
     FOR UPDATE`,
    [unitId]
  );

  if (units.length === 0 || units[0].status === "maintenance") {
    return;
  }

  const [leases] = await connection.execute(
    `SELECT status
     FROM leases
     WHERE unit_id = ?
       AND status IN ('pending', 'active')
     FOR UPDATE`,
    [unitId]
  );

  const hasActiveLease = leases.some(
    (lease) => lease.status === "active"
  );

  const hasPendingLease = leases.some(
    (lease) => lease.status === "pending"
  );

  // Active leases require occupied status.
  // Pending leases keep the unit unavailable for another lease.
  // Units without outstanding leases become available.
  const nextStatus = hasActiveLease
    ? "occupied"
    : hasPendingLease
      ? "available"
      : "available";

  await connection.execute(
    `UPDATE units
     SET status = ?
     WHERE id = ?`,
    [nextStatus, unitId]
  );
}

export async function createLease({
  owner_id,
  unit_id,
  tenant_id,
  start_date,
  end_date,
  monthly_rent,
  deposit_amount,
}) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock and verify the unit belongs to this landlord.
    const [units] = await connection.execute(
      `SELECT u.id, u.status
       FROM units u
       INNER JOIN properties p ON p.id = u.property_id
       WHERE u.id = ? AND p.owner_id = ?
       FOR UPDATE`,
      [unit_id, owner_id]
    );

    if (units.length === 0 || units[0].status !== "available") {
      await connection.rollback();
      return null;
    }

    // Verify the tenant belongs to this landlord.
    const [tenants] = await connection.execute(
      `SELECT id
       FROM tenants
       WHERE id = ? AND landlord_id = ?
       LIMIT 1`,
      [tenant_id, owner_id]
    );

    if (tenants.length === 0) {
      await connection.rollback();
      return null;
    }

    // Check for an existing pending or active lease.
    const existingLeases = await getOutstandingLeases(
      connection,
      unit_id
    );

    if (existingLeases.length > 0) {
      await connection.rollback();
      return null;
    }

    const [result] = await connection.execute(
      `INSERT INTO leases
        (unit_id, tenant_id, start_date, end_date,
         monthly_rent, deposit_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        unit_id,
        tenant_id,
        start_date,
        end_date || null,
        monthly_rent,
        deposit_amount ?? 0,
      ]
    );

    await connection.commit();

    return getLeaseById(result.insertId, owner_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getLeaseById(id, owner_id) {
  const [rows] = await db.execute(
    `SELECT
       l.id,
       l.unit_id,
       u.unit_name,
       p.id AS property_id,
       p.property_name,
       l.tenant_id,
       usr.full_name AS tenant_name,
       usr.email AS tenant_email,
       l.start_date,
       l.end_date,
       l.monthly_rent,
       l.deposit_amount,
       l.status,
       l.created_at
     FROM leases l
     INNER JOIN units u ON u.id = l.unit_id
     INNER JOIN properties p ON p.id = u.property_id
     INNER JOIN tenants t ON t.id = l.tenant_id
     LEFT JOIN users usr ON usr.id = t.user_id
     WHERE l.id = ?
       AND p.owner_id = ?
       AND t.landlord_id = ?
     LIMIT 1`,
    [id, owner_id, owner_id]
  );

  return rows[0] || null;
}

export async function getLeasesByLandlord(owner_id) {
  const [rows] = await db.execute(
    `SELECT
       l.id,
       l.unit_id,
       u.unit_name,
       p.id AS property_id,
       p.property_name,
       l.tenant_id,
       usr.full_name AS tenant_name,
       usr.email AS tenant_email,
       l.start_date,
       l.end_date,
       l.monthly_rent,
       l.deposit_amount,
       l.status,
       l.created_at
     FROM leases l
     INNER JOIN units u ON u.id = l.unit_id
     INNER JOIN properties p ON p.id = u.property_id
     INNER JOIN tenants t ON t.id = l.tenant_id
     LEFT JOIN users usr ON usr.id = t.user_id
     WHERE p.owner_id = ?
       AND t.landlord_id = ?
     ORDER BY l.created_at DESC`,
    [owner_id, owner_id]
  );

  return rows;
}

export async function updateLease(
  id,
  owner_id,
  {
    start_date,
    end_date,
    monthly_rent,
    deposit_amount,
    status,
  }
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Validate the requested status.
    if (!VALID_LEASE_STATUSES.includes(status)) {
      const error = new Error("Invalid lease status.");
      error.code = "INVALID_LEASE_STATUS";
      throw error;
    }

    // Locate the lease and verify landlord ownership.
    const [leases] = await connection.execute(
      `SELECT l.id, l.unit_id, l.status AS lease_status
       FROM leases l
       INNER JOIN units u ON u.id = l.unit_id
       INNER JOIN properties p ON p.id = u.property_id
       INNER JOIN tenants t ON t.id = l.tenant_id
       WHERE l.id = ?
         AND p.owner_id = ?
         AND t.landlord_id = ?
       LIMIT 1`,
      [id, owner_id, owner_id]
    );

    if (leases.length === 0) {
      await connection.rollback();
      return null;
    }

    const lease = leases[0];

    // Lock the unit before checking other leases.
    const unit = await lockUnit(connection, lease.unit_id);

    if (!unit) {
      await connection.rollback();
      return null;
    }

    // A pending or active lease must not conflict with another
    // pending or active lease for the same unit.
    if (status === "pending" || status === "active") {
      if (unit.status === "maintenance") {
        const error = new Error(
          "A unit under maintenance cannot have a pending or active lease."
        );
        error.code = "UNIT_MAINTENANCE";
        throw error;
      }

      const otherLeases = await getOutstandingLeases(
        connection,
        lease.unit_id,
        id
      );

      if (otherLeases.length > 0) {
        const error = new Error(
          "This unit already has another pending or active lease."
        );
        error.code = "UNIT_HAS_LEASE";
        throw error;
      }
    }

    await connection.execute(
      `UPDATE leases
       SET start_date = ?,
           end_date = ?,
           monthly_rent = ?,
           deposit_amount = ?,
           status = ?
       WHERE id = ?`,
      [
        start_date,
        end_date || null,
        monthly_rent,
        deposit_amount ?? 0,
        status,
        id,
      ]
    );

    // Recalculate unit status from the resulting lease records.
    await syncUnitStatus(connection, lease.unit_id);

    await connection.commit();

    return getLeaseById(id, owner_id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteLease(id, owner_id) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Locate the lease and verify landlord ownership.
    const [leases] = await connection.execute(
      `SELECT l.id, l.unit_id, l.status
       FROM leases l
       INNER JOIN units u ON u.id = l.unit_id
       INNER JOIN properties p ON p.id = u.property_id
       INNER JOIN tenants t ON t.id = l.tenant_id
       WHERE l.id = ?
         AND p.owner_id = ?
         AND t.landlord_id = ?
       LIMIT 1`,
      [id, owner_id, owner_id]
    );

    if (leases.length === 0) {
      await connection.rollback();
      return false;
    }

    const lease = leases[0];
    if (lease.status === "active") {
      await connection.rollback();

      const error = new Error(
      "Active leases cannot be deleted. End or terminate the lease first."
     );

      error.code = "ACTIVE_LEASE_DELETE_BLOCKED";
      throw error;
    }

    // Lock the unit to coordinate with lease creation and updates.
    const unit = await lockUnit(connection, lease.unit_id);

    if (!unit) {
      await connection.rollback();
      return false;
    }

    await connection.execute(
      `DELETE FROM leases
       WHERE id = ?`,
      [id]
    );

    // Preserve maintenance and recalculate status using all
    // remaining pending and active leases.
    await syncUnitStatus(connection, lease.unit_id);

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
