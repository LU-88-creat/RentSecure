
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

  // Do not overwrite maintenance status.
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

  // Active leases require occupied status.
  // Otherwise, the unit is available unless under maintenance.
  const nextStatus = hasActiveLease
    ? "occupied"
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
       u.status AS unit_status,
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
    // This initial read identifies the unit to lock.
    const [leases] = await connection.execute(
      `SELECT l.id, l.unit_id
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

    // Lock the unit first. Lease operations for this unit
    // must follow the same locking order.
    const unit = await lockUnit(connection, lease.unit_id);

    if (!unit) {
      await connection.rollback();
      return null;
    }

    // Re-read and lock the lease AFTER locking the unit.
    // Recheck ownership and obtain its current status.
    const [currentLeases] = await connection.execute(
      `SELECT l.id, l.unit_id, l.status AS lease_status
       FROM leases l
       INNER JOIN units u ON u.id = l.unit_id
       INNER JOIN properties p ON p.id = u.property_id
       INNER JOIN tenants t ON t.id = l.tenant_id
       WHERE l.id = ?
         AND l.unit_id = ?
         AND p.owner_id = ?
         AND t.landlord_id = ?
       FOR UPDATE`,
      [id, lease.unit_id, owner_id, owner_id]
    );

    if (currentLeases.length === 0) {
      await connection.rollback();
      return null;
    }

    const currentLease = currentLeases[0];
    const currentStatus = currentLease.lease_status;

    // Validate the transition against the latest lease status.
    const allowedTransitions = {
      pending: ["active", "terminated"],
      active: ["ended", "terminated"],
      ended: [],
      terminated: [],
    };

    if (
      currentStatus !== status &&
      !allowedTransitions[currentStatus]?.includes(status)
    ) {
      const error = new Error(
        `Cannot change lease status from ${currentStatus} to ${status}.`
      );
      error.code = "INVALID_LEASE_TRANSITION";
      throw error;
    }

    // Pending or active leases must not conflict with
    // another pending or active lease for the same unit.
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
       WHERE id = ?
         AND unit_id = ?`,
      [
        start_date,
        end_date || null,
        monthly_rent,
        deposit_amount ?? 0,
        status,
        id,
        lease.unit_id,
      ]
    );

    // Recalculate unit status inside the same transaction.
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
    // This read identifies which unit must be locked.
    const [leases] = await connection.execute(
      `SELECT l.id, l.unit_id
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

    // Lock the unit first to coordinate with creation and updates.
    const unit = await lockUnit(connection, lease.unit_id);

    if (!unit) {
      await connection.rollback();
      return false;
    }

    // Re-read and lock the lease after acquiring the unit lock.
    // Verify ownership again and obtain the current status.
    const [currentLeases] = await connection.execute(
      `SELECT l.id, l.unit_id, l.status
       FROM leases l
       INNER JOIN units u ON u.id = l.unit_id
       INNER JOIN properties p ON p.id = u.property_id
       INNER JOIN tenants t ON t.id = l.tenant_id
       WHERE l.id = ?
         AND l.unit_id = ?
         AND p.owner_id = ?
         AND t.landlord_id = ?
       FOR UPDATE`,
      [id, lease.unit_id, owner_id, owner_id]
    );

    if (currentLeases.length === 0) {
      await connection.rollback();
      return false;
    }

    const currentLease = currentLeases[0];

    // Never delete an active lease.
    if (currentLease.status === "active") {
      const error = new Error(
        "Active leases cannot be deleted. End or terminate the lease first."
      );

      error.code = "ACTIVE_LEASE_DELETE_BLOCKED";
      throw error;
    }

    await connection.execute(
      `DELETE FROM leases
       WHERE id = ?
         AND unit_id = ?`,
      [id, lease.unit_id]
    );

    // Preserve maintenance and recalculate the unit status.
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
