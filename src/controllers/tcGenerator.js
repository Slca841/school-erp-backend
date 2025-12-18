import TransferCertificate from "../models/tcGenerator.js";
import Student from "../models/StudentModel.js";

export const approveTC = async (req, res) => {
  try {
    const { id } = req.params; // studentId

    // ✅ Student find karo
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // ❌ Agar pehle se TC approved hai
    if (student.status === "TC_APPROVED") {
      return res.status(400).json({
        success: false,
        message: "TC already approved for this student",
      });
    }

    // ✅ Last TC number (student-wise)
    const lastTC = await TransferCertificate.findOne({ studentId: id })
      .sort({ tcNumber: -1 });

    const newNumber = lastTC ? lastTC.tcNumber + 1 : 1;

    // ✅ Create TC
    const tc = await TransferCertificate.create({
      studentId: id,
      tcNumber: newNumber,
      approved: true,
      dateOfLeaving: new Date(),
      reason: "On Request",
    });

    // 🔥 MOST IMPORTANT PART
    student.status = "TC_APPROVED";
    await student.save();

    res.status(200).json({
      success: true,
      message: "TC Approved & Student moved to TC list",
      tc,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error approving TC",
      error: err.message,
    });
  }
};

// ✅ GET TC by studentId
export const getStudentTC = async (req, res) => {
  try {
    const { id } = req.params; // studentId
    const tc = await TransferCertificate.findOne({ studentId: id });

    if (!tc) {
      return res.status(404).json({ success: false, message: "No TC found" });
    }

    res.status(200).json({ success: true, tc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching TC", error: err.message });
  }
};
export const getAllTCs = async (req, res) => {
  try {
    const tcs = await TransferCertificate.find()
      .populate("studentId", "fullName studentclass rollNo")
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({ success: true, tcs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching TCs", error: err.message });
  }
};

// GET /api/students/tc/:id
export const studentTcs = async (req, res) => {
  try {
    const { id } = req.params;
    const tcs = await TransferCertificate.find({ studentId: id })
      .populate("studentId", "fullName studentclass rollNo")
      .sort({ createdAt: -1 });

    res.json({ success: true, tcs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching TC history", error: err.message });
  }
};
