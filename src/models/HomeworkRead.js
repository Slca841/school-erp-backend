import mongoose from "mongoose";

const homeworkReadSchema = new mongoose.Schema(
  {
    homeworkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Homework",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

homeworkReadSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });

const HomeworkRead = mongoose.model("HomeworkRead", homeworkReadSchema);
export default HomeworkRead;