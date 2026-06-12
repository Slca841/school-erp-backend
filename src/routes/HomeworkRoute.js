import express from "express";
import {
  createHomework,
  getHomeworkByClass,
  getHomeworkByTeacher,
  deleteHomework,
  deleteAllHomework,
  getUnreadHomeworkCount,
  markHomeworkRead,
    saveHomeworkStatus,
  getStudentHomeworkReport,
  getHomeworkByDate,
   getStudentsForHomework,
   getHomeworkSummary
} from "../controllers/homeworkController.js";
import { homeworkUpload } from "../middleware/homeworkUpload.js";


const homeworkRouter = express.Router();

// ✅ Create new homework
homeworkRouter.post(
  "/create",
  homeworkUpload.single("image"),
  createHomework
);

// ✅ Get homework by class (Student)
homeworkRouter.get("/class/:classId", getHomeworkByClass);

// ✅ Get homework by teacher (Teacher)
homeworkRouter.get("/teacher/homework/:teacherId", getHomeworkByTeacher);

// ✅ Delete homework
homeworkRouter.delete("/delete/:id", deleteHomework);
homeworkRouter.delete("/delete-all/:teacherId", deleteAllHomework);
homeworkRouter.get("/unread/:studentId", getUnreadHomeworkCount);
homeworkRouter.post("/mark-read", markHomeworkRead);
homeworkRouter.get(
  "/by-date",
  getHomeworkByDate
);

homeworkRouter.post(
  "/save-status",
  saveHomeworkStatus
);

homeworkRouter.get(
  "/student-report/:studentId",
  getStudentHomeworkReport
);
homeworkRouter.get(
  "/students/:classId",
  getStudentsForHomework
);
homeworkRouter.get(
  "/summary/:teacherId",
  getHomeworkSummary
);
export default homeworkRouter;