import mongoose from "mongoose";

const FeeReminderSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    totalPaid: {
      type: Number,
      required: true,
    },
    targetFee: {
      type: Number,
      required: true,
    },
      read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const FeeReminder = mongoose.model("FeeReminder", FeeReminderSchema);
export default FeeReminder;