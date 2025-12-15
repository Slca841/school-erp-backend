import mongoose from "mongoose";







const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: { type: String, required: true },
    fatherName: { type: String },
    motherName: { type: String },
    dateOfBirth: { type: Date, required: true },
    dateOfJoining: { type: Date, required: true },
    category: { type: String },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    contact: { type: String },
    aadharNo: { type: String },
    address: { type: String },
    salary: { type: Number, default: 0 },
    qualification: {type: String},

  },
  { timestamps: true }
);

const Teacher = mongoose.model("Teacher", teacherSchema);
export default Teacher;
