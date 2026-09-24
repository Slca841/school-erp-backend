import mongoose from "mongoose";

const transferCertificateSchema = new mongoose.Schema(
  {
    // ========================================
    // STUDENT
    // ========================================
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      unique: true,
    },

    // ========================================
    // TC NUMBER
    // ========================================
    // Example:
    // Student 1 -> 1  (display: 01)
    // Student 2 -> 2  (display: 02)
    // Student 3 -> 3  (display: 03)
    tcNumber: {
      type: Number,
      required: true,
      min: 1,
      unique: true,
    },

    // ========================================
    // ATTENDANCE
    // ========================================
    overallPresent: {
      type: Number,
      default: 0,
    },

    overallAbsent: {
      type: Number,
      default: 0,
    },

    overallLeave: {
      type: Number,
      default: 0,
    },

    attendancePercentage: {
      type: Number,
      default: 0,
    },

    totalWorkingDays: {
      type: Number,
      default: 0,
    },

    // ========================================
    // TC STATUS
    // ========================================
    approved: {
      type: Boolean,
      default: false,
    },

    // ========================================
    // TC DETAILS
    // ========================================
    dateOfLeaving: {
      type: Date,
      default: Date.now,
    },
generalConduct: {
  type: String,
  default: "GOOD",
},
    reason: {
      type: String,
      trim: true,
      default: "",
    },

    // ========================================
    // PAYMENT
    // ========================================
    totalPaidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ========================================
// INDEXES
// ========================================

// One TC per student
transferCertificateSchema.index(
  { studentId: 1 },
  { unique: true }
);

const TransferCertificate = mongoose.model(
  "TransferCertificate",
  transferCertificateSchema
);

export default TransferCertificate;