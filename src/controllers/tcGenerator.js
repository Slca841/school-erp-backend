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
// ========================================
// PREVIEW TC - DOES NOT SAVE ANYTHING
// ========================================

export const previewTC = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id).populate("userId");

    if (!student || student.userId?.isTestUser) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // ================= ATTENDANCE =================

    const attendanceRecords = await Attendance.find({
      "students.studentId": id,
    });

    let overallPresent = 0;
    let overallAbsent = 0;
    let overallLeave = 0;

    attendanceRecords.forEach((record) => {
      const attendance = record.students.find(
        (s) => s.studentId.toString() === id.toString()
      );

      if (!attendance) return;

      switch (attendance.status) {
        case "Present":
          overallPresent++;
          break;

        case "Absent":
          overallAbsent++;
          break;

        case "Leave":
          overallLeave++;
          break;

        default:
          break;
      }
    });

    const totalWorkingDays =
      overallPresent +
      overallAbsent +
      overallLeave;

    const attendancePercentage =
      totalWorkingDays > 0
        ? Number(
            (
              (overallPresent / totalWorkingDays) *
              100
            ).toFixed(2)
          )
        : 0;

    // ================= RESPONSE =================

    res.json({
      success: true,

      student: {
        _id: student._id,
        fullName: student.fullName,
        studentFatherName: student.studentFatherName,
        studentMotherName: student.studentMotherName,
        studentclass: student.studentclass,
        rollNo: student.rollNo,
        category: student.category,
        gender: student.gender,
        religion: student.religion,
        penNo: student.penNo,
        apaarId: student.apaarId,
        dateOfAdmission: student.dateOfAdmission,
        dateOfBirth: student.dateOfBirth,
      },

      attendance: {
        totalWorkingDays,
        overallPresent,
        overallAbsent,
        overallLeave,
        attendancePercentage,
      },
    });

  } catch (err) {
    console.error("❌ TC preview error:", err);

    res.status(500).json({
      success: false,
      message: "Error generating TC preview",
      error: err.message,
    });
  }
};

export const approveTC = async (req, res) => {
  try {
    const { id } = req.params;
   const {
  dateOfLeaving,
  reasonOfTC,
  attendance,
  generalConduct,
} = req.body;

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
    const existingTC = await TransferCertificate.findOne({
  studentId: id,
});

if (existingTC) {
  return res.status(400).json({
    success: false,
    message: "TC already generated",
    tc: existingTC,
  });
}
const attendanceRecords = await Attendance.find({
  "students.studentId": id,
});

let overallPresent = 0;
let overallAbsent = 0;
let overallLeave = 0;

attendanceRecords.forEach((record) => {
  const attendance = record.students.find(
    (s) => s.studentId.toString() === id.toString()
  );

  if (!attendance) return;

  switch (attendance.status) {
    case "Present":
      overallPresent++;
      break;

    case "Absent":
      overallAbsent++;
      break;

    case "Leave":
      overallLeave++;
      break;

    default:
      break;
  }
});

const totalWorkingDays =
  overallPresent + overallAbsent + overallLeave;

const attendancePercentage =
  totalWorkingDays > 0
    ? Number(
        ((overallPresent / totalWorkingDays) * 100).toFixed(2)
      )
    : 0;
    // 💰 PAYMENT SNAPSHOT
    const payments = await StudentFeePayment.find({ studentId: id });
    const totalPaidAmount = payments.reduce(
      (sum, p) => sum + (p.paidAmount || 0),
      0
    );
// 🔢 Generate next global TC number
const lastTC = await TransferCertificate
  .findOne()
  .sort({ tcNumber: -1 });

const nextTCNumber = lastTC
  ? lastTC.tcNumber + 1
  : 1;

    // ✅ TC RECORD STORES DOL + REASON
  const finalPresent =
  attendance?.overallPresent != null
    ? Number(attendance.overallPresent)
    : overallPresent;

const finalAbsent =
  attendance?.overallAbsent != null
    ? Number(attendance.overallAbsent)
    : overallAbsent;

const finalLeave =
  attendance?.overallLeave != null
    ? Number(attendance.overallLeave)
    : overallLeave;

const finalWorkingDays =
  attendance?.totalWorkingDays != null
    ? Number(attendance.totalWorkingDays)
    : totalWorkingDays;

const finalAttendancePercentage =
  finalWorkingDays > 0
    ? Number(
        (
          (finalPresent / finalWorkingDays) *
          100
        ).toFixed(2)
      )
    : 0;

const tc = await TransferCertificate.create({
  studentId: id,

  tcNumber: nextTCNumber,

  approved: true,

  dateOfLeaving,

  reason: reasonOfTC,

  totalPaidAmount,

  // ✅ FINAL EDITED VALUES
  overallPresent: finalPresent,
  overallAbsent: finalAbsent,
  overallLeave: finalLeave,
  totalWorkingDays: finalWorkingDays,
  attendancePercentage: finalAttendancePercentage,

  // ✅ GENERAL CONDUCT
  generalConduct: generalConduct || "GOOD",
});
    
// ✅ STUDENT STATUS UPDATE
student.status = "TC_APPROVED";
await student.save();

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

const tc = await TransferCertificate.findOne({
  studentId: id,
});

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
