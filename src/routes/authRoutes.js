// routes/authRoutes.js
import express from "express";
import {
  sendOtp,
  verifyOtp,
  createAdmin,
  resetPassword
} from "../controllers/adminAuthController.js";

const secureRouter = express.Router();

secureRouter.post("/send-otp", sendOtp);
secureRouter.post("/verify-otp", verifyOtp);
secureRouter.post("/create-admin", createAdmin);
secureRouter.post("/reset-password", resetPassword);

export default secureRouter;
