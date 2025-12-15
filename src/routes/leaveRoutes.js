import express from "express";
import LeaveApplication from "../models/LeaveApplication.js";
import Class from "../models/classAssign.js";

const leaveRoutes = express.Router();

/**
 * 🧩 1. Student applies for leave
 */
leaveRoutes.post("/apply", async (req, res) => {
  try {
    const { studentId, studentName, studentClass, topic, reason, fromDate, toDate } = req.body;

    if (!topic || !reason || !fromDate || !toDate) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // CALCULATE TOTAL DAYS
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const classMap = await Class.findOne({ name: studentClass }).populate("teacherId");

    const newApp = await LeaveApplication.create({
      studentId,
      studentName,
      studentClass,
      topic,
      reason,
      fromDate,
      toDate,
      totalDays,
      teacherId: classMap.teacherId._id,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Leave application submitted",
      data: newApp,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


/**
 * 🧩 2. Get all applications of a student
 */
leaveRoutes.get("/status/:studentId", async (req, res) => {
  try {
    const apps = await LeaveApplication.find({ studentId: req.params.studentId }).sort({ createdAt: -1 });
    res.json({ success: true, applications: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 🧩 3. Get all applications assigned to a teacher
 */
leaveRoutes.get("/teacher/:teacherId", async (req, res) => {
  try {
    const apps = await LeaveApplication.find({ teacherId: req.params.teacherId }).sort({ createdAt: -1 });
    res.json({ success: true, applications: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 🧩 4. Teacher updates leave status
 */
leaveRoutes.put("/update/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const updated = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    // ⭐ FIX: io must be defined here
    const io = req.app.get("io");

    // Notify student
    io.to(`student_${updated.studentId}`).emit("leave_status_update", {
      id: updated._id,
      status: updated.status,
      topic: updated.topic,
    });

    res.json({ success: true, message: "Status updated", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


export default leaveRoutes;