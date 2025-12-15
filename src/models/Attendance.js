import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  className: { type: String, required: true },

  date: { type: Date, required: true },

  students: [
    {
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
      status: { 
        type: String, 
        enum: ["Present", "Absent", "Leave"], // 👈 Leave add kar diya
        default: "Present" 
      }
    }
  ],

  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher" },
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;