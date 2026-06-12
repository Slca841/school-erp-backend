import express from "express";
import {getStudentRiskReport} from "../controllers/studentRiskReport.js";

const reportRouter = express.Router();

reportRouter.get(
  "/student-risk-report/:classId",
  getStudentRiskReport
);

export default reportRouter;
