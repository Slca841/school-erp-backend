import mongoose from "mongoose";

const transferCertificateSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
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
  tcNumber: { type: Number, required: true },   // ✅ ab globally unique nahi
  approved: { type: Boolean, default: false },
  dateOfLeaving: { type: Date, default: Date.now },
  reason: { type: String},
  totalPaidAmount: {
  type: Number,
  default: 0,
},

}, { timestamps: true });

// ✅ Ensure uniqueness per student
transferCertificateSchema.index({ studentId: 1, tcNumber: 1 }, { unique: true });


const TransferCertificate = mongoose.model("TransferCertificate", transferCertificateSchema);
export default TransferCertificate;
  