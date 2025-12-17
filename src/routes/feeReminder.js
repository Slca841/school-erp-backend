import express from "express";
import { getFeeReminder, sendFeeReminder, markFeeReminderRead,getUnreadFeeReminderCount } from "../controllers/feeReminderController.js";
import { getClass } from "../controllers/classAssignController.js";


const feeReminderRouter = express.Router();

feeReminderRouter.get("/classes", getClass); // Class list
feeReminderRouter.post("/send-reminder", sendFeeReminder); // Send reminder
feeReminderRouter.get("/student/:studentId", getFeeReminder); // Get reminder
feeReminderRouter.post("/mark-read", markFeeReminderRead);
feeReminderRouter.get(
  "/unread/:studentId",
  getUnreadFeeReminderCount
);





export default feeReminderRouter;