
import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";

import {
  addLease,
  listLeases,
  getLease,
  editLease,
  removeLease,
} from "../controllers/leaseController.js";

const router = express.Router();

// All lease endpoints require authentication.
router.use(authenticateToken);

// Create a lease.
router.post("/", addLease);

// List leases belonging to the logged-in landlord.
router.get("/", listLeases);

// Retrieve one lease.
router.get("/:id", getLease);

// Update a lease.
router.put("/:id", editLease);

// Delete a lease.
router.delete("/:id", removeLease);

export default router;
