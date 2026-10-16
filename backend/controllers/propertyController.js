
import {
  createProperty,
  getPropertyById,
  getPropertiesByOwner,
  updateProperty,
  deleteProperty,
} from "../models/propertyModel.js";

const allowedPropertyTypes = [
  "apartment",
  "house",
  "commercial",
  "other",
];

function validateProperty(body) {
  const {
    property_name,
    property_type,
    address,
    city,
    description,
  } = body;

  if (
    typeof property_name !== "string" ||
    !property_name.trim() ||
    typeof address !== "string" ||
    !address.trim()
  ) {
    return "Property name and address are required.";
  }

  if (
    property_type !== undefined &&
    !allowedPropertyTypes.includes(property_type)
  ) {
    return "Invalid property type.";
  }

  if (
    city !== undefined &&
    city !== null &&
    typeof city !== "string"
  ) {
    return "City must be a string.";
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    return "Description must be a string.";
  }

  if (property_name.trim().length > 150) {
    return "Property name must not exceed 150 characters.";
  }

  if (address.trim().length > 255) {
    return "Address must not exceed 255 characters.";
  }

  if (city && city.trim().length > 100) {
    return "City must not exceed 100 characters.";
  }

  return null;
}

export async function addProperty(req, res) {
  try {
    if (req.user.role !== "landlord") {
      return res.status(403).json({
        success: false,
        message: "Only landlords can create properties.",
      });
    }

    const validationError = validateProperty(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const property = await createProperty({
      owner_id: req.user.id,
      property_name: req.body.property_name.trim(),
      property_type: req.body.property_type || "apartment",
      address: req.body.address.trim(),
      city: req.body.city?.trim() || null,
      description: req.body.description?.trim() || null,
    });

    return res.status(201).json({
      success: true,
      message: "Property created successfully.",
      property,
    });
  } catch (error) {
    console.error("Create property failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create property.",
    });
  }
}

export async function listProperties(req, res) {
  try {
    if (req.user.role !== "landlord") {
      return res.status(403).json({
        success: false,
        message: "Only landlords can view their properties.",
      });
    }

    const properties = await getPropertiesByOwner(req.user.id);

    return res.status(200).json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    console.error("List properties failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve properties.",
    });
  }
}

export async function getProperty(req, res) {
  try {
    if (req.user.role !== "landlord") {
      return res.status(403).json({
        success: false,
        message: "Only landlords can view their properties.",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const property = await getPropertyById(id, req.user.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    return res.status(200).json({
      success: true,
      property,
    });
  } catch (error) {
    console.error("Get property failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve property.",
    });
  }
}

export async function editProperty(req, res) {
  try {
    if (req.user.role !== "landlord") {
      return res.status(403).json({
        success: false,
        message: "Only landlords can update properties.",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const validationError = validateProperty(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const property = await updateProperty(id, req.user.id, {
      property_name: req.body.property_name.trim(),
      property_type: req.body.property_type || "apartment",
      address: req.body.address.trim(),
      city: req.body.city?.trim() || null,
      description: req.body.description?.trim() || null,
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property updated successfully.",
      property,
    });
  } catch (error) {
    console.error("Update property failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update property.",
    });
  }
}

export async function removeProperty(req, res) {
  try {
    if (req.user.role !== "landlord") {
      return res.status(403).json({
        success: false,
        message: "Only landlords can delete properties.",
      });
    }

    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID.",
      });
    }

    const deleted = await deleteProperty(id, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Property not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully.",
    });
  } catch (error) {
    // A property may be referenced by units or other rental records.
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        success: false,
        message: "This property has related records and cannot be deleted.",
      });
    }

    console.error("Delete property failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to delete property.",
    });
  }
}
