
import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";

import {
  addProperty,
  listProperties,
  getProperty,
  editProperty,
  removeProperty,
} from "../controllers/propertyController.js";

const router = express.Router();

// All property routes require a valid JWT
router.use(authenticateToken);

router.post("/", addProperty);
router.get("/", listProperties);
router.get("/:id", getProperty);
router.put("/:id", editProperty);
router.delete("/:id", removeProperty);

export default router;
