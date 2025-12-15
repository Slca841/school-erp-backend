import express from "express";
import {
  assignSubjectsToTeacher,
  getTeachersByClass,
  deleteSubjectFromClass, // ✅ add this import
} from "../controllers/teacherSubjectController.js";

const subjectAssginRouter = express.Router();

subjectAssginRouter.post("/assign-subjects", assignSubjectsToTeacher);
subjectAssginRouter.get("/class/:className/teachers", getTeachersByClass);

// ✅ NEW DELETE ROUTE
subjectAssginRouter.delete("/delete-subject/:className/:subjectId", deleteSubjectFromClass);

export default subjectAssginRouter;