import express from "express";
import { 
  assignTeacher, 
  getClassStudents,
  createClass, 
  getClasses ,
  getTeacherStudents,
  getClassName,
  getClass,
  getTeacherSubjects
} from "../controllers/classAssignController.js";

const classAssignRouter = express.Router();

// ✅ Create new class
classAssignRouter.post("/create", createClass);

// ✅ Get all classes
classAssignRouter.get("/class", getClasses);

// ✅ Get students of a class
classAssignRouter.get("/class/:classId/students", getClassStudents);

// ✅ Assign teacher to class getTeacherStudents
classAssignRouter.post("/assign", assignTeacher);
classAssignRouter.get("/teacher/:teacherId", getTeacherStudents);
classAssignRouter.get("/class/:className/teacher", getClassName);
classAssignRouter.get("/all", getClass);
classAssignRouter.get(
  "/teacher-subjects/:teacherId",
  getTeacherSubjects
);

export default classAssignRouter;
