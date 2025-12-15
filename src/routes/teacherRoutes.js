// routes/teacherRoutes.js
import express from "express";
import {
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
} from "../controllers/teacherController.js";

const teacherRoutes = express.Router();

teacherRoutes.get("/", getTeachers);
teacherRoutes.get("/:id", getTeacherById);
teacherRoutes.put("/:id", updateTeacher);
teacherRoutes.delete("/:id", deleteTeacher);

export default teacherRoutes;
