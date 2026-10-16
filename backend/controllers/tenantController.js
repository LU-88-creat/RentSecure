
import {
  createTenant,
  getTenantById,
  getTenantsByLandlord,
  updateTenant,
  deleteTenant,
} from "../models/tenantModel.js";

function isValidId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isLandlord(req, res) {
  if (req.user?.role !== "landlord") {
    res.status(403).json({
      success: false,
      message: "Only landlords can manage tenant records.",
    });
    return false;
  }
  return true;
}

export async function addTenant(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const { user_id, national_id, emergency_contact } = req.body;

    if (
      user_id !== undefined &&
      user_id !== null &&
      user_id !== "" &&
      !isValidId(user_id)
    ) {
      return res.status(400).json({
        success: false,
        message: "User ID must be a valid positive integer.",
      });
    }

    if (
      national_id != null &&
      (typeof national_id !== "string" || national_id.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "National ID must be text of at most 100 characters.",
      });
    }

    if (
      emergency_contact != null &&
      (typeof emergency_contact !== "string" ||
        emergency_contact.trim().length > 30)
    ) {
      return res.status(400).json({
        success: false,
        message: "Emergency contact must be text of at most 30 characters.",
      });
    }

    const tenant = await createTenant({
      landlord_id: req.user.id,
      user_id: user_id || null,
      national_id: national_id?.trim() || null,
      emergency_contact: emergency_contact?.trim() || null,
    });

    return res.status(201).json({
      success: true,
      message: "Tenant record created successfully.",
      tenant,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This user already has a tenant record.",
      });
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        success: false,
        message: "The supplied user ID does not exist.",
      });
    }

    console.error("Create tenant failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create tenant record.",
    });
  }
}

export async function listTenants(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const tenants = await getTenantsByLandlord(req.user.id);

    return res.status(200).json({
      success: true,
      tenants,
    });
  } catch (error) {
    console.error("List tenants failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve tenant records.",
    });
  }
}

export async function getTenant(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const tenantId = Number(req.params.id);

    if (!isValidId(tenantId)) {
      return res.status(400).json({
        success: false,
        message: "A valid tenant ID is required.",
      });
    }

    const tenant = await getTenantById(tenantId, req.user.id);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      tenant,
    });
  } catch (error) {
    console.error("Get tenant failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve tenant record.",
    });
  }
}

export async function editTenant(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const tenantId = Number(req.params.id);
    const { national_id, emergency_contact } = req.body;

    if (!isValidId(tenantId)) {
      return res.status(400).json({
        success: false,
        message: "A valid tenant ID is required.",
      });
    }

    if (
      national_id != null &&
      (typeof national_id !== "string" || national_id.trim().length > 100)
    ) {
      return res.status(400).json({
        success: false,
        message: "National ID must be text of at most 100 characters.",
      });
    }

    if (
      emergency_contact != null &&
      (typeof emergency_contact !== "string" ||
        emergency_contact.trim().length > 30)
    ) {
      return res.status(400).json({
        success: false,
        message: "Emergency contact must be text of at most 30 characters.",
      });
    }

    const tenant = await updateTenant(tenantId, req.user.id, {
      national_id: national_id?.trim() || null,
      emergency_contact: emergency_contact?.trim() || null,
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tenant record updated successfully.",
      tenant,
    });
  } catch (error) {
    console.error("Update tenant failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update tenant record.",
    });
  }
}

export async function removeTenant(req, res) {
  if (!isLandlord(req, res)) return;

  try {
    const tenantId = Number(req.params.id);

    if (!isValidId(tenantId)) {
      return res.status(400).json({
        success: false,
        message: "A valid tenant ID is required.",
      });
    }

    const deleted = await deleteTenant(tenantId, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Tenant record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tenant record deleted successfully.",
    });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "This tenant is linked to a lease and cannot be deleted.",
      });
    }

    console.error("Delete tenant failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete tenant record.",
    });
  }
}
