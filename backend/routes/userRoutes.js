
import express from "express";
import { registerUser } from "../controllers/userController.js";

const router = express.Router();

// Register a new tenant account
router.post("/register", registerUser);

export default router;
