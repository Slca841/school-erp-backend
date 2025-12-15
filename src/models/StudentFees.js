import mongoose from "mongoose";

const studentFeesSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  
  examFee: Number,
  admissionFee: Number,
  discount: { type: Number, default: 0 },
  previousYearFee: { type: Number, default: 0 },
  smartClassFee: Number,
  annualFunctionFee: Number,
  diaryFee: Number,
  identityCardFee: Number,
  panalty: Number,
  otherCharges: Number
});

export const StudentFees = mongoose.model("StudentFees", studentFeesSchema);
export default StudentFees;