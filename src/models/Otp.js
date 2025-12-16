// models/Otp.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  otp: String,
  expiresAt: Date,
  used: { type: Boolean, default: false }
});

export default mongoose.model("Otp", otpSchema);
