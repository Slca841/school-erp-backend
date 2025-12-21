import express from "express";
import {
  createHomework,
  getHomeworkByClass,
  getHomeworkByTeacher,
  deleteHomework,
  deleteAllHomework,
  getUnreadHomeworkCount,
  markHomeworkRead
} from "../controllers/homeworkController.js";



const homeworkRouter = express.Router();

// ✅ Create new homework
homeworkRouter.post("/create", createHomework);

// ✅ Get homework by class (Student)
homeworkRouter.get("/class/:classId", getHomeworkByClass);

// ✅ Get homework by teacher (Teacher)
homeworkRouter.get("/teacher/homework/:teacherId", getHomeworkByTeacher);

// ✅ Delete homework
homeworkRouter.delete("/delete/:id", deleteHomework);
homeworkRouter.delete("/delete-all/:teacherId", deleteAllHomework);
homeworkRouter.get("/unread/:studentId", getUnreadHomeworkCount);
homeworkRouter.post("/mark-read", markHomeworkRead);


export default homeworkRouter;