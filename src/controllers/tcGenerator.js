import TransferCertificate from "../models/tcGenerator.js";
import Student from "../models/StudentModel.js";
import Attendance from "../models/Attendance.js";
import StudentFeePayment from "../models/StudentFeePayment.js";
import LeaveApplication from "../models/LeaveApplication.js";
import FeeReminder from "../models/FeeReminderModel.js";
import StudentFees from "../models/StudentFees.js";
import ClassFeeMaster from "../models/ClassFeeMaster.js";


const deleteStudentRelatedDataAfterTC = async (studentId) => {
  // 1️⃣ Attendance → sirf iss student ko pull karo
  await Attendance.updateMany(
    {},
    { $pull: { students: { studentId } } }
  );

  // 2️⃣ Fee Payments
  await StudentFeePayment.deleteMany({ studentId });

  // 3️⃣ Leave Applications
  await LeaveApplication.deleteMany({ studentId });

  // 4️⃣ Fee Reminders
  await FeeReminder.deleteMany({ studentId });
};

const calculateFeeSnapshot = async (student) => {
  const payments = await StudentFeePayment.find({ studentId: student._id });

  const totalPaid = payments.reduce(
    (sum, p) => sum + (p.paidAmount || 0),
    0
  );

  return { totalPaid };
};

export const approveTC = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (student.status === "TC_APPROVED") {
      return res.status(400).json({
        success: false,
        message: "TC already approved",
      });
    }

    // 🔥 STEP 1: TAKE SNAPSHOT BEFORE DELETE
    const snapshot = await calculateFeeSnapshot(student);

    // 🔢 TC number
    const lastTC = await TransferCertificate.findOne({ studentId: id })
      .sort({ tcNumber: -1 });
    const newNumber = lastTC ? lastTC.tcNumber + 1 : 1;

    // 🔥 STEP 2: CREATE TC WITH SNAPSHOT
    const tc = await TransferCertificate.create({
      studentId: id,
      tcNumber: newNumber,
      approved: true,
      dateOfLeaving: new Date(),
      reason: "On Request",
      totalPaid: snapshot.totalPaid,

    });

    // 🔥 STEP 3: DELETE LIVE DATA
    await deleteStudentRelatedDataAfterTC(id);

    // 🔥 STEP 4: UPDATE STUDENT STATUS
    student.status = "TC_APPROVED";
    await student.save();

    res.json({
      success: true,
      message: "TC approved, payment snapshot saved",
      tc,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
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
