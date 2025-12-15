import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: String,
});

export default mongoose.model("Subject", subjectSchema);