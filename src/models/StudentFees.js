import mongoose from "mongoose";

const sessionWiseFeeSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },

    sessionName: {
      type: String,
      required: true,
    },

    // =========================
    // SESSION FEE SNAPSHOT
    // =========================

    yearlyFee: {
      type: Number,
      default: 0,
    },

    previousYearFee: {
      type: Number,
      default: 0,
    },

    examFee: {
      type: Number,
      default: 0,
    },

    admissionFee: {
      type: Number,
      default: 0,
    },

    smartClassFee: {
      type: Number,
      default: 0,
    },

    annualFunctionFee: {
      type: Number,
      default: 0,
    },

    diaryFee: {
      type: Number,
      default: 0,
    },

    identityCardFee: {
      type: Number,
      default: 0,
    },

    panalty: {
      type: Number,
      default: 0,
    },

    otherCharges: {
      type: Number,
      default: 0,
    },

    transportationFee: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    // =========================
    // ACCOUNTING
    // =========================

    totalFee: {
      type: Number,
      default: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
    },

    remainingAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const studentFeesSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },

  examFee: Number,

  admissionFee: Number,

  discount: {
    type: Number,
    default: 0,
  },

  // Existing field — abhi compatibility ke liye rakhenge
  previousYearFee: {
    type: Number,
    default: 0,
  },

  smartClassFee: Number,

  annualFunctionFee: Number,

  diaryFee: Number,

  identityCardFee: Number,

  panalty: Number,

  otherCharges: Number,

  transportationFee: {
    type: Number,
    default: 0,
  },

  // 🔥 Historical + future session records
  sessionWiseFees: {
    type: [sessionWiseFeeSchema],
    default: [],
  },
});

const StudentFees = mongoose.model(
  "StudentFees",
  studentFeesSchema
);

export default StudentFees;