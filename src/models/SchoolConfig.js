import mongoose from "mongoose";

const schoolConfigSchema = new mongoose.Schema({
  authorizedEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  }
});

export default mongoose.model("SchoolConfig", schoolConfigSchema);
