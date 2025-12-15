import mongoose from "mongoose";

const leaveApplicationSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    studentName: String,
    studentClass: String,

    topic: String,
    reason: String,

    // ⭐ NEW FIELDS
    fromDate: { type: Date, required: true }, 
    toDate: { type: Date, required: true },
    totalDays: Number,

    status: { type: String, default: "pending" },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    seenByTeacher: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const LeaveApplication = mongoose.model("LeaveApplication", leaveApplicationSchema);
export default LeaveApplication;
