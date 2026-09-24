import express from "express";

import {
  saveStudentSessionFee,
} from "../controllers/studentSessionFeeController.js";

const router = express.Router();

router.put(
  "/:studentId/session-fee/:sessionId",
  saveStudentSessionFee
);

export default router;