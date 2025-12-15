import express from "express";
import {
  createComplaint,
  getAllComplaints,
  getTeacherComplaints,
  updateComplaintStatus,
  getComplaintsByStudent,
  deleteAllComplaints
} from "../controllers/teacherComplaintController.js";

const complaintsRouter = express.Router();

complaintsRouter.post("/complaint", createComplaint);
complaintsRouter.get("/complaints", getAllComplaints);
complaintsRouter.get("/complaints/:teacherId", getTeacherComplaints);
complaintsRouter.put("/complaints/:id", updateComplaintStatus);
complaintsRouter.get("/student/:studentId", getComplaintsByStudent);
complaintsRouter.delete("/complaints", deleteAllComplaints);

export default complaintsRouter;