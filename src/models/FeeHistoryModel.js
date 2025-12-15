import mongoose from "mongoose";

const FeeHistorySchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    action: {
      type: String,
      enum: ["Class Upgrade", "Class Downgrade"],
      required: true,
    },
    oldClass: String,
    newClass: String,
    carriedForwardFee: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const FeeHistory = mongoose.model("FeeHistory", FeeHistorySchema);
export default FeeHistory;