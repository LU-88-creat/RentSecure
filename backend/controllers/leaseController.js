
import {
  createLease,
  getLeaseById,
  getLeasesByLandlord,
  updateLease,
  deleteLease,
} from "../models/leaseModel.js";

const validStatuses = ["pending", "active", "ended", "terminated"];

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isValidMoney(value, optional = false) {
  if (optional && (value === undefined || value === null || value === "")) {
    return true;
  }

  if (typeof value === "string" && !value.trim()) return false;

  const amount = Number(value);

  return (
    Number.isFinite(amount) &&
    amount >= 0 &&
    amount <= 9999999999.99 &&
    Math.round(amount * 100) === amount * 100
  );
}

function isLandlord(req, res) {
  if (req.user?.role !== "landlord") {
    res.status(403).json({
      success: false,
      message: "Only landlords can manage leases.",
    });

    return false;
  }

  return true;
}

function validateLeaseFields(body, includeStatus = false) {
  const {
    start_date,
    end_date,
    monthly_rent,
    deposit_amount,
    status,
  } = body;

  if (!isValidDate(start_date)) {
    return "A valid start date in YYYY-MM-DD format is required.";
  }

  if (
    end_date !== undefined &&
    end_date !== null &&
    end_date !== "" &&
    !isValidDate(end_date)
  ) {
    return "End date must be a valid date in YYYY-MM-DD format.";
  }

  if (end_date && end_date < start_date) {
    return "End date cannot be earlier than the start date.";
  }

  if (!isValidMoney(monthly_rent) || Number(monthly_rent) <= 0) {
    return "Monthly rent must be a positive amount with up to two decimal places.";
  }

  if (!isValidMoney(deposit_amount, true)) {
    return "Deposit must be a non-negative amount with up to two decimal places.";
  }

  if (includeStatus && !validStatuses.includes(status)) {
    return "Status must be pending, active, ended, or terminated.";
  }

  return null;
}

export async function addLease(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const {
      unit_id,
      tenant_id,
      start_date,
      end_date,
      monthly_rent,
      deposit_amount,
    } = req.body;

    if (!isValidId(unit_id) || !isValidId(tenant_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid unit_id and tenant_id are required.",
      });
    }

    const validationError = validateLeaseFields(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const lease = await createLease({
      owner_id: req.user.id,
      unit_id: Number(unit_id),
      tenant_id: Number(tenant_id),
      start_date,
      end_date: end_date || null,
      monthly_rent: Number(monthly_rent),
      deposit_amount:
        deposit_amount === undefined ||
        deposit_amount === null ||
        deposit_amount === ""
          ? 0
          : Number(deposit_amount),
    });

    if (!lease) {
      return res.status(409).json({
        success: false,
        message:
          "Lease could not be created. Check that the unit is available, both records belong to you, and the unit has no pending or active lease.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Lease created successfully.",
      lease,
    });
  } catch (error) {
    console.error("Create lease failed:", error.message);

    if (
      error.code === "ER_NO_REFERENCED_ROW_2" ||
      error.code === "ER_ROW_IS_REFERENCED_2"
    ) {
      return res.status(400).json({
        success: false,
        message: "The selected unit or tenant is invalid.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create lease.",
    });
  }
}

export async function listLeases(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const leases = await getLeasesByLandlord(req.user.id);

    return res.status(200).json({
      success: true,
      leases,
    });
  } catch (error) {
    console.error("List leases failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve leases.",
    });
  }
}

export async function getLease(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const leaseId = Number(req.params.id);

    if (!isValidId(leaseId)) {
      return res.status(400).json({
        success: false,
        message: "A valid lease ID is required.",
      });
    }

    const lease = await getLeaseById(leaseId, req.user.id);

    if (!lease) {
      return res.status(404).json({
        success: false,
        message: "Lease not found.",
      });
    }

    return res.status(200).json({
      success: true,
      lease,
    });
  } catch (error) {
    console.error("Get lease failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve lease.",
    });
  }
}

export async function editLease(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const leaseId = Number(req.params.id);

    if (!isValidId(leaseId)) {
      return res.status(400).json({
        success: false,
        message: "A valid lease ID is required.",
      });
    }

    const validationError = validateLeaseFields(req.body, true);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const {
      start_date,
      end_date,
      monthly_rent,
      deposit_amount,
      status,
    } = req.body;

    const lease = await updateLease(leaseId, req.user.id, {
      start_date,
      end_date: end_date || null,
      monthly_rent: Number(monthly_rent),
      deposit_amount:
        deposit_amount === undefined ||
        deposit_amount === null ||
        deposit_amount === ""
          ? 0
          : Number(deposit_amount),
      status,
    });

    if (!lease) {
      return res.status(404).json({
        success: false,
        message: "Lease not found or you do not own its property.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lease updated successfully.",
      lease,
    });
  } catch (error) {
    console.error("Update lease failed:", error.message);

    if (error.code === "UNIT_MAINTENANCE") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "UNIT_HAS_LEASE") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update lease.",
    });
  }
}

export async function removeLease(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const leaseId = Number(req.params.id);

    if (!isValidId(leaseId)) {
      return res.status(400).json({
        success: false,
        message: "A valid lease ID is required.",
      });
    }

    const deleted = await deleteLease(leaseId, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Lease not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lease deleted successfully.",
    });
  
} catch (error) {
  console.error("Delete lease failed:", error.message);

  if (error.code === "ACTIVE_LEASE_DELETE_BLOCKED") {
    return res.status(409).json({
      success: false,
      message:
        "Active leases cannot be deleted. End or terminate the lease first.",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Failed to delete lease.",
  });
}

}
