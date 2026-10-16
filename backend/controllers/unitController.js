
import {
  createUnit,
  getUnitById,
  getUnitsByProperty,
  updateUnit,
  deleteUnit,
} from "../models/unitModel.js";

const validStatuses = ["available", "occupied", "maintenance"];

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isValidRent(value) {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0 &&
    Number(value) <= 9999999999.99
  );
}

function isLandlord(req, res) {
  if (req.user?.role !== "landlord") {
    res.status(403).json({
      success: false,
      message: "Only landlords can manage rental units.",
    });
    return false;
  }
  return true;
}

export async function addUnit(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const propertyId = Number(req.params.propertyId);
    const { unit_name, monthly_rent } = req.body;

    if (!isValidId(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "A valid property ID is required.",
      });
    }

    if (
      typeof unit_name !== "string" ||
      !unit_name.trim() ||
      unit_name.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Unit name is required and must not exceed 100 characters.",
      });
    }

    if (!isValidRent(monthly_rent)) {
      return res.status(400).json({
        success: false,
        message: "Monthly rent must be a valid non-negative amount.",
      });
    }

    const unit = await createUnit({
      property_id: propertyId,
      owner_id: req.user.id,
      unit_name: unit_name.trim(),
      monthly_rent: Number(monthly_rent),
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Property not found or you do not own this property.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Rental unit created successfully.",
      unit,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This unit name already exists for the selected property.",
      });
    }

    console.error("Create unit failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create rental unit.",
    });
  }
}

export async function listUnits(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const propertyId = Number(req.params.propertyId);

    if (!isValidId(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "A valid property ID is required.",
      });
    }

    const units = await getUnitsByProperty(propertyId, req.user.id);

    return res.status(200).json({
      success: true,
      units,
    });
  } catch (error) {
    console.error("List units failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve rental units.",
    });
  }
}

export async function getUnit(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const unitId = Number(req.params.id);

    if (!isValidId(unitId)) {
      return res.status(400).json({
        success: false,
        message: "A valid unit ID is required.",
      });
    }

    const unit = await getUnitById(unitId, req.user.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Rental unit not found.",
      });
    }

    return res.status(200).json({
      success: true,
      unit,
    });
  } catch (error) {
    console.error("Get unit failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve rental unit.",
    });
  }
}

export async function editUnit(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const unitId = Number(req.params.id);
    const { unit_name, monthly_rent, status } = req.body;

    if (!isValidId(unitId)) {
      return res.status(400).json({
        success: false,
        message: "A valid unit ID is required.",
      });
    }

    if (
      typeof unit_name !== "string" ||
      !unit_name.trim() ||
      unit_name.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Unit name is required and must not exceed 100 characters.",
      });
    }

    if (!isValidRent(monthly_rent)) {
      return res.status(400).json({
        success: false,
        message: "Monthly rent must be a valid non-negative amount.",
      });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be available, occupied, or maintenance.",
      });
    }

    const unit = await updateUnit(unitId, req.user.id, {
      unit_name: unit_name.trim(),
      monthly_rent: Number(monthly_rent),
      status,
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Rental unit not found or you do not own its property.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Rental unit updated successfully.",
      unit,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This unit name already exists for the selected property.",
      });
    }

    if (
  error.code === "UNIT_HAS_ACTIVE_LEASE" ||
  error.code === "UNIT_HAS_PENDING_LEASE" ||
  error.code === "UNIT_MUST_BE_LEASE_ACTIVATED"
) {
  return res.status(409).json({
    success: false,
    message: error.message,
  });
}

    console.error("Update unit failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update rental unit.",
    });
  }
}

export async function removeUnit(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const unitId = Number(req.params.id);

    if (!isValidId(unitId)) {
      return res.status(400).json({
        success: false,
        message: "A valid unit ID is required.",
      });
    }

    const deleted = await deleteUnit(unitId, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Rental unit not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Rental unit deleted successfully.",
    });
  } catch (error) {
    if (
  error.code === "UNIT_HAS_LEASE" ||
  error.code === "ER_ROW_IS_REFERENCED_2"
) {
  return res.status(409).json({
    success: false,
    message: "This unit is linked to a lease and cannot be deleted.",
  });
}

    console.error("Delete unit failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete rental unit.",
    });
  }
}
