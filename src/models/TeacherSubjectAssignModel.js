import mongoose from "mongoose";

const teacherSubjectAssignSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    className: { type: String, required: true },
    section: { type: String, required: true },
    subjects: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    ],
  },
  { timestamps: true }
);


 const TeacherSubjectAssign =   mongoose.model(
  "TeacherSubjectAssign",
  teacherSubjectAssignSchema
);

export default TeacherSubjectAssign;