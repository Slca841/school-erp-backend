// models/Notification.js
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., "complaint", "leave", "notice", "other"
  message: { type: String, required: true },
  recipientType: { type: String, default: "teacher" }, // "teacher" | "student" | "all" | "class"
  recipientId: { type: mongoose.Schema.Types.ObjectId, refPath: "recipientModel", default: null }, // optional specific user id
  recipientModel: { type: String, enum: ["Teacher", "Student", "User"], default: "User" }, // for refPath if using populate
  className: { type: String, default: null }, // if target is a class
  data: { type: mongoose.Schema.Types.Mixed, default: {} }, // extra payload (eg complaintId)
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => new Date() },
});

const Notification = mongoose.model("Notification", NotificationSchema);
export default Notification