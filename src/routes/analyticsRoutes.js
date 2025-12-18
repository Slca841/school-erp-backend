import express from "express";
import {
  getFeeSummary,
  getAllStudentWithFeeDetails,
  getSingleStudentWithFeeDetails,
  updateStudent,
  getTodaysBirthdays,
  updateOtherFees,
  upgradeOrDegradeClass,
  setOrUpdateClassFee,
  getAllClassFees,
  applyClassFeesToStudents,
  deleteStudentCompletely,
 getActiveStudents,
  getTCStudents 
} from "../controllers/analyticsController.js";

import { approveTC, getStudentTC, getAllTCs, studentTcs } from "../controllers/tcGenerator.js";

const analyticsRoutes = express.Router();

analyticsRoutes.post("/set-class-fee", setOrUpdateClassFee);
analyticsRoutes.get("/get-class-fees", getAllClassFees);
analyticsRoutes.post("/apply-class-fee", applyClassFeesToStudents);
// 📌 All students fee summary (dashboard overview)
analyticsRoutes.get("/fees/summary", getFeeSummary);

// 📌 All students with full fee details
analyticsRoutes.get("/students/fees", getAllStudentWithFeeDetails);    

// 📌 Single student fee details
analyticsRoutes.get("/student/:id", getSingleStudentWithFeeDetails);

analyticsRoutes.put("/student/:id", updateStudent);

analyticsRoutes.get("/birthdays/today", getTodaysBirthdays);


analyticsRoutes.put("/tc/:id", approveTC);
analyticsRoutes.get("/tc/:id", getStudentTC);
analyticsRoutes.get("/tc", getAllTCs);
// ✅ Only single student's TC history
analyticsRoutes.get("/singletc/:id", studentTcs);
analyticsRoutes.get("/students/active", getActiveStudents);
analyticsRoutes.get("/students/tc", getTCStudents);


analyticsRoutes.post("/upgrade", upgradeOrDegradeClass);


analyticsRoutes.put("/other/:id", updateOtherFees);

analyticsRoutes.delete("/delete-student/:id", deleteStudentCompletely);

export default analyticsRoutes;
