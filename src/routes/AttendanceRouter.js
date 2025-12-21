import express from "express";
import { 
    markAttendance,
    
    getTeacherAttendanceSummary, 
  getAdminAttendanceSummary, 
  getClassWiseSummary,
  getTodayAttendance,
  getStudentOverallAttendance,
  getTeacherAssignedStudents
} from "../controllers/attendanceController.js";

const attendanceRouter = express.Router();

// ✅ Mark attendance (POST)
attendanceRouter.post("/mark", markAttendance);

// ✅ Get today's class attendance by teacherId (GET)
// attendanceRouter.get("/teacher/:teacherId", getClassAttendance);

attendanceRouter.get("/teacher/:teacherId/summary", getTeacherAttendanceSummary);

// ✅ Admin: school-wide summary
attendanceRouter.get("/admin/summary", getAdminAttendanceSummary);

// ✅ Admin: class wise summary
attendanceRouter.get("/admin/class/:classId/summary", getClassWiseSummary);

attendanceRouter.get("/teacher/:teacherId/today", getTodayAttendance);

attendanceRouter.get("/student/:studentId/overall", getStudentOverallAttendance);
attendanceRouter.get("/teacher/:teacherId", getTeacherAssignedStudents);
export default attendanceRouter;
