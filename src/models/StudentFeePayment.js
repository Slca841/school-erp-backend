import mongoose from "mongoose";

const studentFeePaymentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },

  paidAmount: {
    type: Number,
    required: true,
  },
year: {
  type: Number,
  required: true,
},
      sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },
  // ✅ NEW
  receiptNumber: {
    type: Number,
    required: true,
    unique: true,
  },

  date: {
    type: Date,
    default: Date.now,
  },

  installment: {
    type: String,
    required: true,
  },

});

const StudentFeePayment = mongoose.model(
  "StudentFeePayment",
  studentFeePaymentSchema
);

export default StudentFeePayment;