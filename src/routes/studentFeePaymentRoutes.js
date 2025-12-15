import express from "express";
import {
  addPayment,
  getPaymentsByStudent,
  updatePayment,
  deletePayment,

} from "../controllers/studentFeePaymentController.js";

const router = express.Router();

// Add new payment
router.post("/add", addPayment);

// Get all payments of one student
router.get("/:studentId", getPaymentsByStudent);

// Update a payment
router.put("/:id", updatePayment);

// Delete a payment
router.delete("/:id", deletePayment);

export default router;
