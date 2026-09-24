import express from "express";

import {
  createAcademicSession,
  getAcademicSessions,
  getCurrentAcademicSession,
  generateCurrentSessionFees
} from "../controllers/academicSessionController.js";

const router = express.Router();

router.post("/", createAcademicSession);

router.get("/", getAcademicSessions);

router.get("/current", getCurrentAcademicSession);

router.post(
  "/generate-current-fees",
  generateCurrentSessionFees
);

export default router;