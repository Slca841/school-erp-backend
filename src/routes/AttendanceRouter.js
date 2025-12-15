import express from "express";
import { 
    markAttendance,
     getClassAttendance , 
    getTeacherAttendanceSummary, 
  getAdminAttendanceSummary, 
  getClassWiseSummary,
  getTodayAttendance,
  getStudentOverallAttendance
} from "../controllers/attendanceController.js";

const attendanceRouter = express.Router();

// ✅ Mark attendance (POST)
attendanceRouter.post("/mark", markAttendance);

// ✅ Get today's class attendance by teacherId (GET)
attendanceRouter.get("/teacher/:teacherId", getClassAttendance);

attendanceRouter.get("/teacher/:teacherId/summary", getTeacherAttendanceSummary);

// ✅ Admin: school-wide summary
attendanceRouter.get("/admin/summary", getAdminAttendanceSummary);

// ✅ Admin: class wise summary
attendanceRouter.get("/admin/class/:classId/summary", getClassWiseSummary);

attendanceRouter.get("/today/:classId", getTodayAttendance);

attendanceRouter.get("/student/:studentId/overall", getStudentOverallAttendance);

export default attendanceRouter;
