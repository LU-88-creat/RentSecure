
import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";

import {
  addTenant,
  listTenants,
  getTenant,
  editTenant,
  removeTenant,
} from "../controllers/tenantController.js";

const router = express.Router();

// All tenant endpoints require authentication.
router.use(authenticateToken);

// Create a tenant record.
router.post("/", addTenant);

// List tenants belonging to the logged-in landlord.
router.get("/", listTenants);

// Retrieve one tenant.
router.get("/:id", getTenant);

// Update tenant-specific information.
router.put("/:id", editTenant);

// Delete a tenant record.
router.delete("/:id", removeTenant);

export default router;
