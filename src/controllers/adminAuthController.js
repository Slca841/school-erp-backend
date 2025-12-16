import SchoolConfig from "../models/SchoolConfig.js";
import User from "../models/userModel.js";
import Otp from "../models/Otp.js";
import bcrypt from "bcrypt";
import { sendEmailOtp } from "../utils/sendEmailOtp.js";

/* ---------------- SEND OTP (EMAIL ONLY) ---------------- */
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const config = await SchoolConfig.findOne();
    if (!config)
      return res.status(500).json({ message: "School config missing" });

 if (email.trim().toLowerCase() !== config.authorizedEmail.trim().toLowerCase()) {
  return res.status(403).json({ message: "Unauthorized email" });
}


    const otp = Math.floor(100000 + Math.random() * 900000);

    await Otp.create({
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await sendEmailOtp(email, otp);

    res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------------- VERIFY OTP ---------------- */
export const verifyOtp = async (req, res) => {
  const { otp } = req.body;

  const record = await Otp.findOne({
    otp,
    used: false,
    expiresAt: { $gt: new Date() }
  });

  if (!record)
    return res.status(400).json({ message: "Invalid or expired OTP" });

  record.used = true;
  await record.save();

  res.json({ success: true });
};

/* ---------------- CREATE ADMIN ---------------- */
export const createAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin)
    return res.status(400).json({ message: "Admin already exists" });

  const hash = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email,
    password: hash,
    role: "admin"
  });

  res.json({ success: true, message: "Admin created successfully" });
};

/* ---------------- RESET PASSWORD ---------------- */
export const resetPassword = async (req, res) => {
  const { newPassword } = req.body;

  const admin = await User.findOne({ role: "admin" });
  if (!admin)
    return res.status(404).json({ message: "Admin not found" });

  const hash = await bcrypt.hash(newPassword, 10);
  admin.password = hash;
  await admin.save();

  res.json({ success: true, message: "Password reset successful" });
};
