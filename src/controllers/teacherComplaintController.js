// controllers/teacherComplaintController.js
import TeacherComplaint from "../models/TeacherComplaint.js";

export const createComplaint = async (req, res) => {
  try {
    const { studentId, teacherId, complaint } = req.body;

    if (!studentId || !teacherId || !complaint)
      return res.status(400).json({ success: false, message: "All fields required" });

    const newC = await TeacherComplaint.create({ studentId, teacherId, complaint, status: "Pending" });

    const io = req.app.get("io");
    
    // ✅ Emit to admin room (same as Sidebar is listening for)
    io.to("admins").emit("new_complaint_admin", {
      complaintId: newC._id,
      studentId,
      teacherId,
      complaint,
      createdAt: newC.createdAt,
    });

    res.status(201).json({ success: true, complaint: newC });
  } catch (err) {
    console.error("❌ Complaint creation error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🧩 Get all complaints (Admin)
export const getAllComplaints = async (req, res) => {
  try {
    const complaints = await TeacherComplaint.find()
      .populate("studentId", "fullName studentclass")
      .populate("teacherId", "fullName email");
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🧩 Teacher specific
export const getTeacherComplaints = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const complaints = await TeacherComplaint.find({ teacherId })
      .populate("studentId", "fullName studentclass")
      .populate("teacherId", "fullName");
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🧩 Update Complaint
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await TeacherComplaint.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    res.json({ success: true, complaint: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🧩 Complaints by Student
export const getComplaintsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const complaints = await TeacherComplaint.find({ studentId })
      .populate("teacherId", "fullName")
      .sort({ createdAt: -1 });
    res.json({ success: true, complaints });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
// 🧨 Delete ALL Complaints
// 🧨 Delete ALL Complaints
export const deleteAllComplaints = async (req, res) => {
  try {
    const result = await TeacherComplaint.deleteMany({}); // DELETE EVERYTHING

    res.json({
      success: true,
      message: "All complaints deleted successfully",
      deletedCount: result.deletedCount,
    });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

