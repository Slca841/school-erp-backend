import TransferCertificate from "../models/tcGenerator.js";
import Student from "../models/StudentModel.js";
import Attendance from "../models/Attendance.js";
import StudentFeePayment from "../models/StudentFeePayment.js";
import LeaveApplication from "../models/LeaveApplication.js";
import FeeReminder from "../models/FeeReminderModel.js";
import User from "../models/userModel.js";


const deleteStudentRelatedDataAfterTC = async (studentId) => {
  // 1️⃣ Attendance → sirf iss student ko pull karo
await Attendance.updateMany(
  { "students.studentId": studentId },
  { $pull: { students: { studentId } } }
);


  // 2️⃣ Fee Payments
  await StudentFeePayment.deleteMany({ studentId });

  // 3️⃣ Leave Applications
  await LeaveApplication.deleteMany({ studentId });

  // 4️⃣ Fee Reminders
  await FeeReminder.deleteMany({ studentId });
};


export const approveTC = async (req, res) => {
  try {
    const { id } = req.params;
    const { dateOfLeaving, reasonOfTC } = req.body;

    if (!dateOfLeaving || !reasonOfTC) {
      return res.status(400).json({
        success: false,
        message: "Date of Leaving & Reason are required",
      });
    }

    const student = await Student.findById(id).populate("userId");
    if (!student || student.userId?.isTestUser) {
      return res.status(404).json({ success: false });
    }

    // 💰 PAYMENT SNAPSHOT
    const payments = await StudentFeePayment.find({ studentId: id });
    const totalPaidAmount = payments.reduce(
      (sum, p) => sum + (p.paidAmount || 0),
      0
    );
// 🔢 Generate next TC number for this student
const lastTC = await TransferCertificate
  .findOne({ studentId: id })
  .sort({ tcNumber: -1 });

const nextTCNumber = lastTC ? lastTC.tcNumber + 1 : 1;

    // ✅ TC RECORD STORES DOL + REASON
    const tc = await TransferCertificate.create({
      studentId: id,
   tcNumber: nextTCNumber,
      approved: true,
      dateOfLeaving,
      reason: reasonOfTC,
      totalPaidAmount,
    });

    await deleteStudentRelatedDataAfterTC(id);

    // 🔒 LOGIN DISABLE
    const user = await User.findById(student.userId);
    if (user) {
      user.isActive = false;
      await user.save();
    }

    res.json({
      success: true,
      message: "TC Approved Successfully",
      tc,
    });
  } catch (err) {
    console.error("❌ TC approve error:", err);
    res.status(500).json({ success: false });
  }
};




// ✅ GET TC by studentId
export const getStudentTC = async (req, res) => {
  try {
    const { id } = req.params;

    const tcs = await TransferCertificate
      .find({ studentId: id })
      .sort({ createdAt: -1 });

    if (!tcs || tcs.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No TC found" });
    }

    res.status(200).json({ success: true, tcs });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

export const getAllTCs = async (req, res) => {
  try {
  const tcs = await TransferCertificate.find()
  .populate({
    path: "studentId",
    select: "fullName studentclass rollNo userId",
    populate: { path: "userId", select: "isTestUser" }
  }).sort({ createdAt: -1 }); // latest first
const realTCs = tcs.filter(
  tc => !tc.studentId?.userId?.isTestUser
);
    res.status(200).json({ success: true, realTCs });
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
