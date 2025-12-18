// controllers/analyticsController.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import User from "../models/userModel.js";
import Student from "../models/StudentModel.js";
import StudentFees from "../models/StudentFees.js";
import StudentFeePayment from "../models/StudentFeePayment.js";
import FeeHistory from "../models/FeeHistoryModel.js";
import ClassFeeMaster from "../models/ClassFeeMaster.js";
import Teacher from "../models/TeacherModel.js";

/* -------------------------------------------------------------------------- */
/* 🧹 DELETE OLD STUDENT ACADEMIC DATA */
/* -------------------------------------------------------------------------- */
import Attendance from "../models/Attendance.js";
import Homework from "../models/Homework.js";
import TeacherComplaint from "../models/TeacherComplaint.js";
import LeaveApplication from "../models/LeaveApplication.js";
import Notice from "../models/Notice.js";
import FeeReminder from "../models/FeeReminderModel.js";

const deleteOldStudentData = async (studentId, oldClass) => {
  try {
  await Attendance.updateMany(
    {},
    { $pull: { students: { studentId } } },
    { session }
  );

  await Homework.deleteMany({ classId: oldClass }, { session });
  await TeacherComplaint.deleteMany({ studentId }, { session });
  await LeaveApplication.deleteMany({ studentId }, { session });
  await Notice.deleteMany({ targetClass: oldClass }, { session });
  await FeeReminder.deleteMany({ studentId }, { session });
  } catch (err) {
    console.error("❌ Error deleting old student data:", err);
  }
};

/* -------------------------------------------------------------------------- */
/* 🧮 FEE CALCULATION (SINGLE SOURCE OF TRUTH) */
/* -------------------------------------------------------------------------- */
const getEffectiveFee = (studentFee, classFee) => {
  studentFee = studentFee || {};
  classFee = classFee || {}; // 🔥 THIS LINE FIXES CRASH

  const yearlyFee = Number(classFee.yearlyFee || 0);
  const previousYearFee = Number(studentFee.previousYearFee || 0);

  const pick = (studentVal, classVal) => {
    const s = Number(studentVal || 0);
    const c = Number(classVal || 0);
    return s > 0 ? s : c;
  };

  const examFee = pick(studentFee.examFee, classFee.examFee);
  const admissionFee = pick(studentFee.admissionFee, classFee.admissionFee);
  const smartClassFee = pick(studentFee.smartClassFee, classFee.smartClassFee);
  const annualFunctionFee = pick(studentFee.annualFunctionFee, classFee.annualFunctionFee);
  const diaryFee = pick(studentFee.diaryFee, classFee.diaryFee);
  const identityCardFee = pick(studentFee.identityCardFee, classFee.identityCardFee);
  const panalty = pick(studentFee.panalty, classFee.panalty);
  const otherCharges = pick(studentFee.otherCharges, classFee.otherCharges);

  const otherFees =
    examFee +
    admissionFee +
    smartClassFee +
    annualFunctionFee +
    diaryFee +
    identityCardFee +
    panalty +
    otherCharges;

  const discount = Number(studentFee.discount || 0);

  const totalFee =
    yearlyFee + previousYearFee + otherFees - discount;

  return {
    yearlyFee,
    previousYearFee,
    otherFees,
    discount,
    totalFee,

    examFee,
    admissionFee,
    smartClassFee,
    annualFunctionFee,
    diaryFee,
    identityCardFee,
    panalty,
    otherCharges,
  };
};



/* -------------------------------------------------------------------------- */
/* 1️⃣ SET / UPDATE CLASS FEE */
/* -------------------------------------------------------------------------- */
export const setOrUpdateClassFee = async (req, res) => {
  try {
    const { className, feeType, feeAmount } = req.body;
    if (!className || !feeType)
      return res.status(400).json({ success: false, message: "Missing parameters" });

    let feeDoc = await ClassFeeMaster.findOne({ className });
    if (!feeDoc) feeDoc = new ClassFeeMaster({ className });

    feeDoc[feeType] = Number(feeAmount || 0);
    await feeDoc.save();

    res.json({
      success: true,
      message: `Updated ${feeType} for ${className}`,
      data: feeDoc,
    });
  } catch (err) {
    console.error("❌ setOrUpdateClassFee error:", err);
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 2️⃣ GET ALL CLASS FEES */
/* -------------------------------------------------------------------------- */
export const getAllClassFees = async (_, res) => {
  try {
    const data = await ClassFeeMaster.find().sort({ className: 1 });
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 3️⃣ APPLY CLASS FEES TO ALL STUDENTS */
/* -------------------------------------------------------------------------- */
export const applyClassFeesToStudents = async (req, res) => {
  const { className } = req.body;

  const students = await Student.find({ studentclass: className });

  for (const s of students) {
    const exists = await StudentFees.findOne({ studentId: s._id });
    if (!exists) {
      await StudentFees.create({ studentId: s._id });
    }
  }

  res.json({ success: true, message: "Student fee records ensured" });
};


/* -------------------------------------------------------------------------- */
/* 4️⃣ UPDATE STUDENT-SPECIFIC FEES */
/* -------------------------------------------------------------------------- */
export const updateOtherFees = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 ONLY ALLOWED FIELDS
    const payload = {
      examFee: Number(req.body.examFee || 0),
      admissionFee: Number(req.body.admissionFee || 0),
      smartClassFee: Number(req.body.smartClassFee || 0),
      annualFunctionFee: Number(req.body.annualFunctionFee || 0),
      diaryFee: Number(req.body.diaryFee || 0),
      identityCardFee: Number(req.body.identityCardFee || 0),
      panalty: Number(req.body.panalty || 0),
      otherCharges: Number(req.body.otherCharges || 0),
      discount: Number(req.body.discount || 0),

    };

    let fees = await StudentFees.findOne({ studentId: id });

    if (fees) {
      fees = await StudentFees.findOneAndUpdate(
        { studentId: id },
        { $set: payload },
        { new: true }
      );
    } else {
      fees = await StudentFees.create({ studentId: id, ...payload });
    }

    res.json({
      success: true,
      message: "Student fees updated (previous year fee locked)",
      fees,
    });
  } catch (err) {
    console.error("❌ updateOtherFees error:", err);
    res.status(500).json({ success: false });
  }
};


/* -------------------------------------------------------------------------- */
/* 5️⃣ CLASS UPGRADE / DOWNGRADE */
/* -------------------------------------------------------------------------- */


export const upgradeOrDegradeClass = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { selectedStudents, type } = req.body;

    if (!Array.isArray(selectedStudents) || selectedStudents.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "No students selected" });
    }

    const classList = [
      "Nursery","LK-G","UK-G","1st","2nd","3rd","4th","5th",
      "6th","7th","8th","9th","10th","11th","12th"
    ];

    let updated = 0;

    for (const item of selectedStudents) {
      const student = await Student.findById(item.id).session(session);
      if (!student) throw new Error("Student not found");

      const oldClass = student.studentclass;
      const index = classList.indexOf(oldClass);
      if (index === -1) throw new Error("Invalid class");

      const nextClass =
        type === "upgrade" ? classList[index + 1] : classList[index - 1];

      if (!nextClass || (type === "upgrade" && oldClass === "12th")) {
        throw new Error("Invalid upgrade");
      }

      let feeRecord = await StudentFees.findOne({ studentId: student._id }).session(session);
      if (!feeRecord) {
        feeRecord = await StudentFees.create(
          [{ studentId: student._id }],
          { session }
        );
        feeRecord = feeRecord[0];
      }

      const oldClassFee = await ClassFeeMaster.findOne({ className: oldClass }).session(session);
      const payments = await StudentFeePayment.find({ studentId: student._id }).session(session);

      const totalPaid = payments.reduce((s, p) => s + (p.paidAmount || 0), 0);
      const effective = getEffectiveFee(feeRecord, oldClassFee);
      const remainingFee = Math.max(effective.totalFee - totalPaid, 0);

      // ❌ delete payment ONLY inside transaction
      await StudentFeePayment.deleteMany(
        { studentId: student._id },
        { session }
      );

      feeRecord.previousYearFee = remainingFee;

      const newClassFee = await ClassFeeMaster.findOne({ className: nextClass }).session(session);

      feeRecord.examFee = newClassFee?.examFee || 0;
      feeRecord.admissionFee = newClassFee?.admissionFee || 0;
      feeRecord.smartClassFee = newClassFee?.smartClassFee || 0;
      feeRecord.annualFunctionFee = newClassFee?.annualFunctionFee || 0;
      feeRecord.diaryFee = newClassFee?.diaryFee || 0;
      feeRecord.identityCardFee = newClassFee?.identityCardFee || 0;
      feeRecord.panalty = newClassFee?.panalty || 0;
      feeRecord.otherCharges = newClassFee?.otherCharges || 0;

      await feeRecord.save({ session });

      student.previousClass = oldClass;
      student.studentclass = nextClass;

      // 🔒 IMPORTANT: validation error aaye to rollback hoga
      await student.save({ session });

      await FeeHistory.create(
        [{
          studentId: student._id,
          action: type === "upgrade" ? "Class Upgrade" : "Class Downgrade",
          oldClass,
          newClass: nextClass,
          carriedForwardFee: remainingFee,
        }],
        { session }
      );

      await deleteOldStudentData(student._id, oldClass, session);
      updated++;
    }

    // ✅ ALL OK → COMMIT
    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: `Updated ${updated} students` });

  } catch (err) {
    // ❌ ANY ERROR → FULL ROLLBACK
    await session.abortTransaction();
    session.endSession();

    console.error("❌ Upgrade rollback:", err.message);

    res.status(500).json({
      success: false,
      message: "Upgrade failed. No data was changed.",
    });
  }
};


/* -------------------------------------------------------------------------- */
/* 6️⃣ FEE SUMMARY */
/* -------------------------------------------------------------------------- */
export const getFeeSummary = async (_, res) => {
  try {
    const students = await Student.find();
    const fees = await StudentFees.find();
    const payments = await StudentFeePayment.find();

    const maleCount = await Student.countDocuments({ gender: "Male" });
    const femaleCount = await Student.countDocuments({ gender: "Female" });

    let totalFee = 0;

    for (const s of students) {
      const fee = fees.find(f => f.studentId.toString() === s._id.toString());
      const classFee = await ClassFeeMaster.findOne({ className: s.studentclass });
      const effective = getEffectiveFee(fee, classFee);
      totalFee += effective.totalFee;
    }

    const totalPaid = payments.reduce((s, p) => s + (p.paidAmount || 0), 0);

    res.json({
      success: true,
      totalStudents: students.length,
      totalFee,
      totalPaid,
      totalRemaining: totalFee - totalPaid,
      maleCount,
      femaleCount,
    });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 7️⃣ ALL STUDENTS WITH FEES */
/* -------------------------------------------------------------------------- */
export const getAllStudentWithFeeDetails = async (_, res) => {
  try {
    const students = await Student.find();
    const fees = await StudentFees.find();
    const payments = await StudentFeePayment.find();

    const data = await Promise.all(
      students.map(async (s) => {
        const fee = fees.find(
          (f) => f.studentId.toString() === s._id.toString()
        );

        const classFee = await ClassFeeMaster.findOne({
          className: s.studentclass,
        });

        const effective = getEffectiveFee(fee, classFee);

        const paid = payments.filter(
          (p) => p.studentId.toString() === s._id.toString()
        );

        const totalPaid = paid.reduce(
          (sum, p) => sum + (p.paidAmount || 0),
          0
        );

        return {
          _id: s._id,
          fullName: s.fullName,
          studentclass: s.studentclass,
          studentFatherName: s.studentFatherName,
   contact1: s.contact1,
          // 🔥 SEND ALL CALCULATED FIELDS
          yearlyFee: effective.yearlyFee,
          previousYearFee: effective.previousYearFee,
          otherFees: effective.otherFees,
          discount: effective.discount,
          totalFee: effective.totalFee,

          totalPaid,
          remainingFee: effective.totalFee - totalPaid,
        };
      })
    );

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getAllStudentWithFeeDetails error:", err);
    res.status(500).json({ success: false });
  }
};


/* -------------------------------------------------------------------------- */
/* 8️⃣ SINGLE STUDENT FEES */
/* -------------------------------------------------------------------------- */
export const getSingleStudentWithFeeDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id).populate(
      "userId",
      "name email originalPassword"
    );
    if (!student)
      return res.json({ success: false, message: "Student not found" });

    const fee = await StudentFees.findOne({ studentId: id });
    const classFee = await ClassFeeMaster.findOne({
      className: student.studentclass,
    });
    const payments = await StudentFeePayment.find({ studentId: id });

    const effective = getEffectiveFee(fee, classFee);
    const totalPaid = payments.reduce(
      (sum, p) => sum + (p.paidAmount || 0),
      0
    );

res.json({
  success: true,
  student: {
    ...student._doc,

    yearlyFee: effective.yearlyFee,
    previousYearFee: effective.previousYearFee,

    // 🔥 SEND BREAKUP
    examFee: effective.examFee,
    admissionFee: effective.admissionFee,
    smartClassFee: effective.smartClassFee,
    annualFunctionFee: effective.annualFunctionFee,
    diaryFee: effective.diaryFee,
    identityCardFee: effective.identityCardFee,
    panalty: effective.panalty,
    otherCharges: effective.otherCharges,

    otherFees: effective.otherFees,
    discount: effective.discount,
    totalFee: effective.totalFee,

    totalPaid,
    remainingFee: effective.totalFee - totalPaid,
    monthlyPayments: payments,
  },
});

  } catch (err) {
    console.error("❌ getSingleStudentWithFeeDetails error:", err);
    res.status(500).json({ success: false });
  }
};


/* -------------------------------------------------------------------------- */
/* 9️⃣ TODAY'S BIRTHDAYS */
/* -------------------------------------------------------------------------- */
export const getTodaysBirthdays = async (_, res) => {
  try {
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth();

    const students = await Student.find();
    const teachers = await Teacher.find();

    res.json({
      success: true,
      students: students.filter(s => new Date(s.dateOfBirth).getDate() === d && new Date(s.dateOfBirth).getMonth() === m),
      teachers: teachers.filter(t => new Date(t.dateOfBirth).getDate() === d && new Date(t.dateOfBirth).getMonth() === m),
    });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔟 UPDATE STUDENT PROFILE */
/* -------------------------------------------------------------------------- */
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const data = { ...req.body };

    const student = await Student.findById(id);
    const user = await User.findById(student.userId);

    if (data.name) user.name = data.name;
    if (data.email) user.email = data.email;
    if (data.password?.trim()) {
      user.password = await bcrypt.hash(data.password, 10);
      user.originalPassword = data.password;
    }

    await user.save();

    delete data.password;
    delete data.name;
    delete data.email;

    const updatedStudent = await Student.findByIdAndUpdate(id, data, { new: true })
      .populate("userId", "name email originalPassword");

    res.json({ success: true, student: updatedStudent });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 🗑️ DELETE STUDENT COMPLETELY */
/* -------------------------------------------------------------------------- */
export const deleteStudentCompletely = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);

    await StudentFees.deleteMany({ studentId: id });
    await StudentFeePayment.deleteMany({ studentId: id });
    await FeeHistory.deleteMany({ studentId: id });
    await deleteOldStudentData(id, student.studentclass);

    await Student.findByIdAndDelete(id);
    await User.findByIdAndDelete(student.userId);

    res.json({ success: true, message: "Student deleted completely" });
  } catch {
    res.status(500).json({ success: false });
  }
};


/* 🟢 ACTIVE STUDENTS */
export const getActiveStudents = async (req, res) => {
  try {
    // 🔥 ONLY ACTIVE STUDENTS
    const students = await Student.find({ status: "ACTIVE" });

    const fees = await StudentFees.find();
    const payments = await StudentFeePayment.find();

    const data = await Promise.all(
      students.map(async (s) => {
        const fee = fees.find(
          (f) => f.studentId.toString() === s._id.toString()
        );

        const classFee = await ClassFeeMaster.findOne({
          className: s.studentclass,
        });

        const effective = getEffectiveFee(fee, classFee);

        const paid = payments.filter(
          (p) => p.studentId.toString() === s._id.toString()
        );

        const totalPaid = paid.reduce(
          (sum, p) => sum + (p.paidAmount || 0),
          0
        );

        return {
          _id: s._id,
          fullName: s.fullName,
          studentclass: s.studentclass,
          studentFatherName: s.studentFatherName,
          contact1: s.contact1,

          // 🔥 EXACT SAME FIELDS
          yearlyFee: effective.yearlyFee,
          previousYearFee: effective.previousYearFee,
          otherFees: effective.otherFees,
          discount: effective.discount,
          totalFee: effective.totalFee,

          totalPaid,
          remainingFee: effective.totalFee - totalPaid,
        };
      })
    );

    res.json({ success: true, students: data });
  } catch (err) {
    console.error("❌ getActiveStudents error:", err);
    res.status(500).json({ success: false });
  }
};


/* 🔴 TC APPROVED STUDENTS */
export const getTCStudents = async (req, res) => {
  try {
    const students = await Student.find({ status: "TC_APPROVED" });

    const fees = await StudentFees.find();
    const payments = await StudentFeePayment.find();

    const data = await Promise.all(
      students.map(async (s) => {
        const fee = fees.find(
          (f) => f.studentId.toString() === s._id.toString()
        );

        const classFee = await ClassFeeMaster.findOne({
          className: s.studentclass,
        });

        const effective = getEffectiveFee(fee, classFee);

        const paid = payments.filter(
          (p) => p.studentId.toString() === s._id.toString()
        );

        const totalPaid = paid.reduce(
          (sum, p) => sum + (p.paidAmount || 0),
          0
        );

        return {
          _id: s._id,
          fullName: s.fullName,
          studentclass: s.studentclass,
          studentFatherName: s.studentFatherName,
          contact1: s.contact1,

          yearlyFee: effective.yearlyFee,
          previousYearFee: effective.previousYearFee,
          otherFees: effective.otherFees,
          discount: effective.discount,
          totalFee: effective.totalFee,

          totalPaid,
          remainingFee: effective.totalFee - totalPaid,
        };
      })
    );

    res.json({ success: true, students: data });
  } catch (err) {
    console.error("❌ getTCStudents error:", err);
    res.status(500).json({ success: false });
  }
};

