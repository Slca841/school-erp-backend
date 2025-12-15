import mongoose from "mongoose";

const guardianSchema = new mongoose.Schema({
  name: { type: String },
  relation: { type: String, enum: ["Father", "Mother", "Guardian", "Other"], default: "Guardian" },
  contactNumber: { type: String },
  email: { type: String },
  address: { type: String },
  authorizedPersons: [
    {
      name: { type: String },
      relation: { type: String },
      contactNumber: { type: String },
      note: { type: String },
    },
  ],
});

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fullName: { type: String, required: true },
    studentFatherName: { type: String },
    studentMotherName: { type: String },

    dateOfBirth: { type: Date, required: true },
    studentclass: { type: String, required: true },

    rollNo: { type: String, required: true },
    dateOfAdmission: { type: Date, required: true },

    category: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"] },

    contact1: { type: String },
    contact2: { type: String },

    scholarNo: { type: String },
    aadharNo: { type: String },
    samagraId: { type: String },
    penNo: { type: String },
    apaarId: { type: String },

    address: { type: String },

    // ✅ Guardian is fully optional & default null
    guardian: {
      type: guardianSchema,
      required: false,
      default: null,
    },
  },
  { timestamps: true }
);

const Student = mongoose.model("Student", studentSchema);
export default Student;
