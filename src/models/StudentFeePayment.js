import mongoose from "mongoose";

const studentFeePaymentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  paidAmount: Number,
  date: { type: Date, default: Date.now },
  month: String,
  year: Number
});

const StudentFeePayment = mongoose.model("StudentFeePayment", studentFeePaymentSchema);
export default StudentFeePayment 