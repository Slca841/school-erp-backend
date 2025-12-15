import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher", // ✅ ab User nahi Teacher hoga
  },
});

const Class = mongoose.model("Class", classSchema);
export default Class;
