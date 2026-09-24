import mongoose from "mongoose";

const academicSessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    startYear: {
      type: Number,
      required: true,
    },

    endYear: {
      type: Number,
      required: true,
    },

    isCurrent: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "CLOSED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

const AcademicSession = mongoose.model(
  "AcademicSession",
  academicSessionSchema
);

export default AcademicSession;