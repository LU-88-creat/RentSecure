
import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";

import {
  addUnit,
  listUnits,
  getUnit,
  editUnit,
  removeUnit,
} from "../controllers/unitController.js";

const router = express.Router();

// All unit routes require authentication.
router.use(authenticateToken);

// Create a unit under a specific property.
router.post("/properties/:propertyId", addUnit);

// List units belonging to a specific property.
router.get("/properties/:propertyId", listUnits);

// Retrieve one unit.
router.get("/:id", getUnit);

// Update a unit.
router.put("/:id", editUnit);

// Delete a unit.
router.delete("/:id", removeUnit);

export default router;
