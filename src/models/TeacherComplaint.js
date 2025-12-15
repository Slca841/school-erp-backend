import mongoose from "mongoose";

const teacherComplaintSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    complaint: String,
    status: { type: String, default: "Pending" },
    seenByTeacher: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const TeacherComplaint = mongoose.model( "TeacherComplaint", teacherComplaintSchema);
export default TeacherComplaint;