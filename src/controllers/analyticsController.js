// controllers/analyticsController.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import User from "../models/userModel.js";
import Student from "../models/StudentModel.js";
import StudentFees from "../models/StudentFees.js";
import StudentFeePayment from "../models/StudentFeePayment.js";
import AcademicSession from "../models/AcademicSession.js";
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
import TransferCertificate from "../models/tcGenerator.js";
import {
  syncStudentCurrentSessionFee,
  syncStudentFeeChain
} from "../services/studentFeeSyncService.js";
const deleteOldStudentData = async (studentId, oldClass, session = null) => {
  const options = session ? { session } : {};

  await Attendance.updateMany(
    {},
    { $pull: { students: { studentId } } },
    options
  );
  await TeacherComplaint.deleteMany({ studentId }, options);
  await LeaveApplication.deleteMany({ studentId }, options);
  await Notice.deleteMany({ targetClass: oldClass }, options);
  await FeeReminder.deleteMany({ studentId }, options);
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
const transportationFee = pick(
  studentFee.transportationFee,
  classFee.transportationFee
);
  const otherFees =
    examFee +
    admissionFee +
    smartClassFee +
    annualFunctionFee +
    diaryFee +
    identityCardFee +
    panalty +
    otherCharges+
     transportationFee;

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
    transportationFee,
  };
};

/* =========================================================
   SESSION FEE SNAPSHOT
========================================================= */

const saveSessionFeeSnapshot = async ({
  feeRecord,
  sessionId,
  sessionName,
  effectiveFee,
  totalPaid,
  session,
}) => {
  if (!sessionId) {
    throw new Error("Academic session is required");
  }

  const existingSnapshot = feeRecord.sessionWiseFees?.find(
    (item) =>
      item.sessionId?.toString() === sessionId.toString()
  );

  // 🔒 SAME SESSION DOBARA CREATE NAHI HOGA
  if (existingSnapshot) {
    return existingSnapshot;
  }

  const remainingAmount = Math.max(
    Number(effectiveFee.totalFee || 0) -
      Number(totalPaid || 0),
    0
  );

  const snapshot = {
    sessionId,
    sessionName,

    yearlyFee: Number(effectiveFee.yearlyFee || 0),

    previousYearFee: Number(
      effectiveFee.previousYearFee || 0
    ),

    examFee: Number(effectiveFee.examFee || 0),

    admissionFee: Number(
      effectiveFee.admissionFee || 0
    ),

    smartClassFee: Number(
      effectiveFee.smartClassFee || 0
    ),

    annualFunctionFee: Number(
      effectiveFee.annualFunctionFee || 0
    ),

    diaryFee: Number(
      effectiveFee.diaryFee || 0
    ),

    identityCardFee: Number(
      effectiveFee.identityCardFee || 0
    ),

    panalty: Number(
      effectiveFee.panalty || 0
    ),

    otherCharges: Number(
      effectiveFee.otherCharges || 0
    ),

    transportationFee: Number(
      effectiveFee.transportationFee || 0
    ),

    discount: Number(
      effectiveFee.discount || 0
    ),

    totalFee: Number(
      effectiveFee.totalFee || 0
    ),

    paidAmount: Number(
      totalPaid || 0
    ),

    remainingAmount,
  };

  feeRecord.sessionWiseFees.push(snapshot);

  await feeRecord.save({ session });

  return snapshot;
};
/* -------------------------------------------------------------------------- */
/* 1️⃣ SET / UPDATE CLASS FEE */
/* -------------------------------------------------------------------------- */
export const setOrUpdateClassFee = async (req, res) => {
  try {
    const {
      className,
      yearlyFee,
      examFee,
      smartClassFee,
      admissionFee,
      annualFunctionFee,
      diaryFee,
      identityCardFee,
      panalty,
      otherCharges,
      transportationFee,
    } = req.body;

    if (!className) {
      return res.status(400).json({
        message: "className is required",
      });
    }

    // 1. Update / create ClassFeeMaster
    const feeDoc = await ClassFeeMaster.findOneAndUpdate(
      {
        className: {
          $regex: `^${className}$`,
          $options: "i",
        },
      },
      {
        className,
        yearlyFee: Number(yearlyFee || 0),
        examFee: Number(examFee || 0),
        smartClassFee: Number(smartClassFee || 0),
        admissionFee: Number(admissionFee || 0),
        annualFunctionFee: Number(annualFunctionFee || 0),
        diaryFee: Number(diaryFee || 0),
        identityCardFee: Number(identityCardFee || 0),
        panalty: Number(panalty || 0),
        otherCharges: Number(otherCharges || 0),
        transportationFee: Number(transportationFee || 0),
      },
      {
        new: true,
        upsert: true,
      }
    );
// ==========================================
// GET SELECTED ACADEMIC SESSION
// ==========================================

const currentSession =
  await AcademicSession.findById(sessionId);

if (!currentSession) {
  return res.status(400).json({
    success: false,
    message: "Selected academic session not found",
  });
}

    // 3. Find students of this class
    const students = await Student.find({
      studentclass: {
        $regex: `^${className}$`,
        $options: "i",
      },
      status: { $ne: "inactive" },
    });

    const updatedStudents = [];

    // 4. Update CURRENT session only
    for (const student of students) {
      let studentFees = await StudentFees.findOne({
        studentId: student._id,
      });

      if (!studentFees) {
        studentFees = new StudentFees({
          studentId: student._id,
        });
      }

      const getFee = (studentValue, masterValue) => {
        return Number(studentValue || 0) > 0
          ? Number(studentValue)
          : Number(masterValue || 0);
      };

      // Yearly fee currently comes only from ClassFeeMaster
      const yearlyFeeValue = Number(feeDoc.yearlyFee || 0);

      const examFeeValue = getFee(
        studentFees.examFee,
        feeDoc.examFee
      );

      const admissionFeeValue = getFee(
        studentFees.admissionFee,
        feeDoc.admissionFee
      );

      const smartClassFeeValue = getFee(
        studentFees.smartClassFee,
        feeDoc.smartClassFee
      );

      const annualFunctionFeeValue = getFee(
        studentFees.annualFunctionFee,
        feeDoc.annualFunctionFee
      );

      const diaryFeeValue = getFee(
        studentFees.diaryFee,
        feeDoc.diaryFee
      );

      const identityCardFeeValue = getFee(
        studentFees.identityCardFee,
        feeDoc.identityCardFee
      );

      const panaltyValue = getFee(
        studentFees.panalty,
        feeDoc.panalty
      );

      const otherChargesValue = getFee(
        studentFees.otherCharges,
        feeDoc.otherCharges
      );

      const transportationFeeValue = getFee(
        studentFees.transportationFee,
        feeDoc.transportationFee
      );

      // 5. Find current session snapshot
      let currentSnapshot =
        studentFees.sessionWiseFees.find(
          (item) =>
            item.sessionId.toString() ===
            currentSession._id.toString()
        );

      // If snapshot does not exist, create it
      if (!currentSnapshot) {
        let previousYearFee = 0;

        const previousSession = await AcademicSession.findOne({
          startYear: {
            $lt: currentSession.startYear,
          },
        }).sort({ startYear: -1 });

        if (previousSession) {
          const previousSnapshot =
            studentFees.sessionWiseFees.find(
              (item) =>
                item.sessionId.toString() ===
                previousSession._id.toString()
            );

          previousYearFee =
            Number(previousSnapshot?.remainingAmount || 0);
        }

        currentSnapshot = {
          sessionId: currentSession._id,
          sessionName: currentSession.name,

          yearlyFee: yearlyFeeValue,
          previousYearFee,

          examFee: examFeeValue,
          admissionFee: admissionFeeValue,
          smartClassFee: smartClassFeeValue,
          annualFunctionFee: annualFunctionFeeValue,
          diaryFee: diaryFeeValue,
          identityCardFee: identityCardFeeValue,
          panalty: panaltyValue,
          otherCharges: otherChargesValue,
          transportationFee: transportationFeeValue,

          discount: Number(studentFees.discount || 0),

          totalFee: 0,
          paidAmount: 0,
          remainingAmount: 0,
        };

        studentFees.sessionWiseFees.push(currentSnapshot);

        currentSnapshot =
          studentFees.sessionWiseFees[
            studentFees.sessionWiseFees.length - 1
          ];
      } else {
        // Existing CURRENT session snapshot
        // Previous year fee should NOT change
        currentSnapshot.yearlyFee = yearlyFeeValue;

        currentSnapshot.examFee = examFeeValue;
        currentSnapshot.admissionFee = admissionFeeValue;
        currentSnapshot.smartClassFee = smartClassFeeValue;
        currentSnapshot.annualFunctionFee =
          annualFunctionFeeValue;
        currentSnapshot.diaryFee = diaryFeeValue;
        currentSnapshot.identityCardFee =
          identityCardFeeValue;
        currentSnapshot.panalty = panaltyValue;
        currentSnapshot.otherCharges = otherChargesValue;
        currentSnapshot.transportationFee =
          transportationFeeValue;
      }

      // 6. Recalculate total
      currentSnapshot.totalFee =
        Number(currentSnapshot.yearlyFee || 0) +
        Number(currentSnapshot.previousYearFee || 0) +
        Number(currentSnapshot.examFee || 0) +
        Number(currentSnapshot.admissionFee || 0) +
        Number(currentSnapshot.smartClassFee || 0) +
        Number(currentSnapshot.annualFunctionFee || 0) +
        Number(currentSnapshot.diaryFee || 0) +
        Number(currentSnapshot.identityCardFee || 0) +
        Number(currentSnapshot.panalty || 0) +
        Number(currentSnapshot.otherCharges || 0) +
        Number(currentSnapshot.transportationFee || 0) -
        Number(currentSnapshot.discount || 0);

      // 7. Get payments of CURRENT session
      const payments = await StudentFeePayment.find({
        studentId: student._id,
        sessionId: currentSession._id,
      });

      const paidAmount = payments.reduce(
        (sum, payment) =>
          sum + Number(payment.paidAmount || 0),
        0
      );

      currentSnapshot.paidAmount = paidAmount;

      currentSnapshot.remainingAmount =
        Math.max(
          Number(currentSnapshot.totalFee || 0) -
            paidAmount,
          0
        );

      await studentFees.save();

      updatedStudents.push({
        studentId: student._id,
        studentName: student.name,
      });
    }

    return res.json({
      message:
        "Class fee updated and current session fees synchronized.",
      feeMaster: feeDoc,
      updatedStudents,
    });
  } catch (error) {
    console.error("setOrUpdateClassFee error:", error);

    return res.status(500).json({
      message: "Failed to update class fee",
      error: error.message,
    });
  }
};
/* =========================================================
   TOTAL PREVIOUS SESSION PENDING
========================================================= */

const getPreviousSessionsPending = (
  feeRecord,
  currentSessionId
) => {
  if (!feeRecord?.sessionWiseFees?.length) {
    return 0;
  }

  return feeRecord.sessionWiseFees
    .filter(
      (item) =>
        item.sessionId?.toString() !==
        currentSessionId?.toString()
    )
    .reduce(
      (sum, item) =>
        sum + Number(item.remainingAmount || 0),
      0
    );
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

const students = await Student.find({
  studentclass: className,
  status: "ACTIVE",
}).populate("userId");

const realStudents = students.filter(
  s => s.userId && !s.userId.isTestUser
);



for (const s of realStudents) {
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
    const { sessionId } = req.body;

    // ==========================================
    // VALIDATION
    // ==========================================

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Academic session is required",
      });
    }

    // ==========================================
    // GET SELECTED SESSION
    // ==========================================

    const selectedSession =
      await AcademicSession.findById(sessionId);

    if (!selectedSession) {
      return res.status(404).json({
        success: false,
        message: "Selected academic session not found",
      });
    }

    // ==========================================
    // GET STUDENT
    // ==========================================

    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // ==========================================
    // PAYLOAD
    // ==========================================

    const payload = {
      previousYearFee: Number(
        req.body.previousYearFee || 0
      ),

      examFee: Number(
        req.body.examFee || 0
      ),

      admissionFee: Number(
        req.body.admissionFee || 0
      ),

      smartClassFee: Number(
        req.body.smartClassFee || 0
      ),

      annualFunctionFee: Number(
        req.body.annualFunctionFee || 0
      ),

      diaryFee: Number(
        req.body.diaryFee || 0
      ),

      identityCardFee: Number(
        req.body.identityCardFee || 0
      ),

      panalty: Number(
        req.body.panalty || 0
      ),

      otherCharges: Number(
        req.body.otherCharges || 0
      ),

      discount: Number(
        req.body.discount || 0
      ),

      transportationFee: Number(
        req.body.transportationFee || 0
      ),
    };

    // ==========================================
    // GET STUDENT FEE RECORD
    // ==========================================

    let fees = await StudentFees.findOne({
      studentId: id,
    });

    if (!fees) {
      fees = new StudentFees({
        studentId: id,
        sessionWiseFees: [],
      });
    }

    // ==========================================
    // FIND SELECTED SESSION SNAPSHOT
    // ==========================================

    let selectedSnapshot =
      fees.sessionWiseFees.find(
        (item) =>
          item.sessionId?.toString() ===
          selectedSession._id.toString()
      );

    // ==========================================
    // IF SNAPSHOT DOES NOT EXIST
    // ==========================================

    if (!selectedSnapshot) {
      return res.status(404).json({
        success: false,
        message:
          "Fee snapshot not found for selected session",
      });
    }

    // ==========================================
    // KEEP YEARLY FEE
    // ==========================================

    const yearlyFee = Number(
      selectedSnapshot.yearlyFee || 0
    );

    // ==========================================
    // UPDATE SELECTED SESSION FEES
    // ==========================================

    selectedSnapshot.examFee =
      payload.examFee;

    selectedSnapshot.admissionFee =
      payload.admissionFee;

    selectedSnapshot.smartClassFee =
      payload.smartClassFee;

    selectedSnapshot.annualFunctionFee =
      payload.annualFunctionFee;

    selectedSnapshot.diaryFee =
      payload.diaryFee;

    selectedSnapshot.identityCardFee =
      payload.identityCardFee;

    selectedSnapshot.panalty =
      payload.panalty;

    selectedSnapshot.otherCharges =
      payload.otherCharges;

    selectedSnapshot.transportationFee =
      payload.transportationFee;

    selectedSnapshot.discount =
      payload.discount;

    selectedSnapshot.previousYearFee =
      payload.previousYearFee;

    // ==========================================
    // RECALCULATE TOTAL
    // ==========================================

    const totalFee =
      yearlyFee +
      Number(selectedSnapshot.previousYearFee || 0) +
      Number(selectedSnapshot.examFee || 0) +
      Number(selectedSnapshot.admissionFee || 0) +
      Number(selectedSnapshot.smartClassFee || 0) +
      Number(selectedSnapshot.annualFunctionFee || 0) +
      Number(selectedSnapshot.diaryFee || 0) +
      Number(selectedSnapshot.identityCardFee || 0) +
      Number(selectedSnapshot.panalty || 0) +
      Number(selectedSnapshot.otherCharges || 0) +
      Number(selectedSnapshot.transportationFee || 0) -
      Number(selectedSnapshot.discount || 0);

    selectedSnapshot.totalFee =
      Math.max(totalFee, 0);

    // ==========================================
    // GET PAYMENTS FOR SELECTED SESSION
    // ==========================================

    const payments =
      await StudentFeePayment.find({
        studentId: id,
        sessionId: selectedSession._id,
      });

    const totalPaid =
      payments.reduce(
        (sum, payment) =>
          sum + Number(payment.paidAmount || 0),
        0
      );

    selectedSnapshot.paidAmount =
      totalPaid;

    selectedSnapshot.remainingAmount =
      Math.max(
        selectedSnapshot.totalFee -
          totalPaid,
        0
      );

    // ==========================================
    // UPDATE ROOT FIELDS
    // ONLY FOR CURRENT SESSION
    // ==========================================

    if (selectedSession.isCurrent === true) {
      fees.previousYearFee =
        selectedSnapshot.previousYearFee;

      fees.examFee =
        selectedSnapshot.examFee;

      fees.admissionFee =
        selectedSnapshot.admissionFee;

      fees.smartClassFee =
        selectedSnapshot.smartClassFee;

      fees.annualFunctionFee =
        selectedSnapshot.annualFunctionFee;

      fees.diaryFee =
        selectedSnapshot.diaryFee;

      fees.identityCardFee =
        selectedSnapshot.identityCardFee;

      fees.panalty =
        selectedSnapshot.panalty;

      fees.otherCharges =
        selectedSnapshot.otherCharges;

      fees.transportationFee =
        selectedSnapshot.transportationFee;

      fees.discount =
        selectedSnapshot.discount;
    }

    // ==========================================
    // SAVE
    // ==========================================
await fees.save();

await syncStudentFeeChain(id);

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.json({
      success: true,
      message:
        "Student fees updated successfully",
      fees,
    });

  } catch (err) {
    console.error(
      "❌ updateOtherFees error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update student fees",
      error: err.message,
    });
  }
};


/* -------------------------------------------------------------------------- */
/* 5️⃣ CLASS UPGRADE / DOWNGRADE */
/* -------------------------------------------------------------------------- */

export const upgradeOrDegradeClass = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      studentIds,
      newClass,
      reason,
    } = req.body;

    if (
      !Array.isArray(studentIds) ||
      studentIds.length === 0 ||
      !newClass
    ) {
      return res.status(400).json({
        success: false,
        message: "Student IDs and new class are required",
      });
    }

    session.startTransaction();

    // --------------------------------------------------
    // 1. CURRENT ACADEMIC SESSION
    // --------------------------------------------------

    const currentAcademicSession =
      await AcademicSession.findOne({
        isCurrent: true,
        status: "ACTIVE",
      }).session(session);

    if (!currentAcademicSession) {
      throw new Error("Current academic session not found");
    }

    // --------------------------------------------------
    // 2. NEW CLASS FEE MASTER
    // --------------------------------------------------

    const newClassFee =
      await ClassFeeMaster.findOne({
        className: newClass,
      }).session(session);

    if (!newClassFee) {
      throw new Error(
        `Fee structure not found for class ${newClass}`
      );
    }

    // --------------------------------------------------
    // 3. PROCESS STUDENTS
    // --------------------------------------------------

    for (const studentId of studentIds) {
      const student = await Student.findById(
        studentId
      ).session(session);

      if (!student) {
        continue;
      }

    const oldClass = student.studentclass;

      // ----------------------------------------------
      // Student Fee Record
      // ----------------------------------------------

      let feeRecord =
        await StudentFees.findOne({
          studentId,
        }).session(session);

      if (!feeRecord) {
        feeRecord = new StudentFees({
          studentId,
          sessionWiseFees: [],
        });
      }

      // ----------------------------------------------
      // Current Session Snapshot
      // ----------------------------------------------

      let currentSessionFee =
        feeRecord.sessionWiseFees.find(
          (item) =>
            item.sessionId?.toString() ===
            currentAcademicSession._id.toString()
        );

      // ----------------------------------------------
      // Current Session Payments
      // ----------------------------------------------

      const currentSessionPayments =
        await StudentFeePayment.find({
          studentId,
          sessionId: currentAcademicSession._id,
        }).session(session);

      const totalPaid = currentSessionPayments.reduce(
        (sum, payment) =>
          sum + Number(payment.paidAmount || 0),
        0
      );

      // ----------------------------------------------
      // OLD CURRENT SESSION FEE
      // ----------------------------------------------

      let oldTotalFee = 0;
      let oldPaidAmount = totalPaid;
      let oldRemainingAmount = 0;

      if (currentSessionFee) {
        oldTotalFee = Number(
          currentSessionFee.totalFee || 0
        );

        // Payment records are source of truth
        oldPaidAmount = totalPaid;

        oldRemainingAmount = Math.max(
          oldTotalFee - oldPaidAmount,
          0
        );

        currentSessionFee.paidAmount =
          oldPaidAmount;

        currentSessionFee.remainingAmount =
          oldRemainingAmount;
      } else {
        // ------------------------------------------
        // If snapshot doesn't exist, create old fee
        // from old class master as fallback
        // ------------------------------------------

        const oldClassFee =
          await ClassFeeMaster.findOne({
            className: oldClass,
          }).session(session);

        if (oldClassFee) {
          oldTotalFee =
            Number(oldClassFee.yearlyFee || 0) +
            Number(oldClassFee.examFee || 0) +
            Number(oldClassFee.admissionFee || 0) +
            Number(oldClassFee.smartClassFee || 0) +
            Number(
              oldClassFee.annualFunctionFee || 0
            ) +
            Number(oldClassFee.diaryFee || 0) +
            Number(
              oldClassFee.identityCardFee || 0
            ) +
            Number(oldClassFee.panalty || 0) +
            Number(oldClassFee.otherCharges || 0) +
            Number(
              oldClassFee.transportationFee || 0
            );

          oldRemainingAmount = Math.max(
            oldTotalFee - oldPaidAmount,
            0
          );
        }
      }

      // ----------------------------------------------
      // NEW CLASS FEE
      // ----------------------------------------------

      const yearlyFee =
        Number(newClassFee.yearlyFee || 0);

      const examFee =
        Number(newClassFee.examFee || 0);

      const admissionFee =
        Number(newClassFee.admissionFee || 0);

      const smartClassFee =
        Number(newClassFee.smartClassFee || 0);

      const annualFunctionFee =
        Number(
          newClassFee.annualFunctionFee || 0
        );

      const diaryFee =
        Number(newClassFee.diaryFee || 0);

      const identityCardFee =
        Number(
          newClassFee.identityCardFee || 0
        );

      const panalty =
        Number(newClassFee.panalty || 0);

      const otherCharges =
        Number(newClassFee.otherCharges || 0);

      const transportationFee =
        Number(
          newClassFee.transportationFee || 0
        );

      // ----------------------------------------------
      // NEW SESSION TOTAL
      // ----------------------------------------------

      const totalFee =
        yearlyFee +
        oldRemainingAmount +
        examFee +
        admissionFee +
        smartClassFee +
        annualFunctionFee +
        diaryFee +
        identityCardFee +
        panalty +
        otherCharges +
        transportationFee;

      const remainingAmount = Math.max(
        totalFee - totalPaid,
        0
      );

      // ----------------------------------------------
      // UPDATE / CREATE CURRENT SESSION SNAPSHOT
      // ----------------------------------------------

      const newSnapshot = {
        sessionId:
          currentAcademicSession._id,

        sessionName:
          currentAcademicSession.name,

        yearlyFee,

        previousYearFee:
          oldRemainingAmount,

        examFee,

        admissionFee,

        smartClassFee,

        annualFunctionFee,

        diaryFee,

        identityCardFee,

        panalty,

        otherCharges,

        transportationFee,

        discount: 0,

        totalFee,

        paidAmount: totalPaid,

        remainingAmount,
      };

      if (currentSessionFee) {
        Object.assign(
          currentSessionFee,
          newSnapshot
        );
      } else {
        feeRecord.sessionWiseFees.push(
          newSnapshot
        );
      }

      // ----------------------------------------------
      // UPDATE ROOT FIELDS
      // ----------------------------------------------
      // Compatibility with existing analytics code.
      // Historical session data remains untouched.

      feeRecord.previousYearFee =
        oldRemainingAmount;

      feeRecord.examFee = examFee;
      feeRecord.admissionFee = admissionFee;
      feeRecord.smartClassFee =
        smartClassFee;
      feeRecord.annualFunctionFee =
        annualFunctionFee;
      feeRecord.diaryFee = diaryFee;
      feeRecord.identityCardFee =
        identityCardFee;
      feeRecord.panalty = panalty;
      feeRecord.otherCharges =
        otherCharges;
      feeRecord.transportationFee =
        transportationFee;
      feeRecord.discount = 0;

      await feeRecord.save({
        session,
      });

      // ----------------------------------------------
      // CHANGE STUDENT CLASS
      // ----------------------------------------------

    student.studentclass = newClass;

      await student.save({
        session,
      });

      // ----------------------------------------------
      // FEE HISTORY
      // ----------------------------------------------

      await FeeHistory.create(
        [
          {
            studentId,
            oldClass,
            newClass,
            reason:
              reason ||
              "Class upgrade/downgrade",
            previousYearFee:
              oldRemainingAmount,
            sessionId:
              currentAcademicSession._id,
          },
        ],
        {
          session,
        }
      );

      // ----------------------------------------------
      // IMPORTANT:
      // DO NOT DELETE PAYMENTS
      // ----------------------------------------------
    }

    // --------------------------------------------------
    // 4. COMMIT
    // --------------------------------------------------

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message:
        "Students upgraded/downgraded successfully",
    });
  } catch (error) {
    await session.abortTransaction();

    console.error(
      "Upgrade/Downgrade error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to upgrade/downgrade students",
    });
  } finally {
    session.endSession();
  }
};
/* -------------------------------------------------------------------------- */
/* 6️⃣ FEE SUMMARY */
/* -------------------------------------------------------------------------- */

export const getFeeSummary = async (_, res) => {
  try {
  const students = await Student.find().populate("userId");
    const fees = await StudentFees.find();
    const payments = await StudentFeePayment.find();

    /* ===============================
       ✅ TC STUDENTS निकालो
    =============================== */
    const tcStudents = await TransferCertificate.find().select("studentId");
    const tcStudentIds = tcStudents.map(tc => tc.studentId.toString());

    /* ===============================
       ✅ ACTIVE STUDENTS COUNT
    =============================== */

const activeStudents = students.filter(
  s =>
    s.status === "ACTIVE" &&
    s.userId &&
    !s.userId.isTestUser
);

    const maleCount = activeStudents.filter(s => s.gender === "Male").length;
    const femaleCount = activeStudents.filter(s => s.gender === "Female").length;

    /* ===============================
       ❌ FEE LOGIC SAME (UNCHANGED)
    =============================== */
const classFees = await ClassFeeMaster.find();

const classFeeMap = {};

classFees.forEach((c) => {
  classFeeMap[c.className] = c;
});

let totalFee = 0;

for (const s of activeStudents) {
  const fee = fees.find(
    (f) => f.studentId.toString() === s._id.toString()
  );

  const classFee = classFeeMap[s.studentclass];

  const effective = getEffectiveFee(fee, classFee);

  totalFee += effective.totalFee;
}

    const totalPaid = payments.reduce((s, p) => s + (p.paidAmount || 0), 0);

    res.json({
      success: true,
      totalStudents: activeStudents.length, // ✅ FIXED
      totalFee,
      totalPaid,
      totalRemaining: totalFee - totalPaid,
      maleCount,
      femaleCount,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 7️⃣ ALL STUDENTS WITH FEES */
/* -------------------------------------------------------------------------- */
export const getAllStudentWithFeeDetails = async (_, res) => {
  try {
    const students = await Student.find().populate("userId");

const realStudents = students.filter(
  s => s.userId && !s.userId.isTestUser
);

    const fees = await StudentFees.find();
    const payments = await StudentFeePayment.find();

    const data = await Promise.all(
      realStudents.map(async (s) => {
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

    // ==========================================
    // STUDENT
    // ==========================================

    const student = await Student.findById(id).populate(
      "userId",
      "name email originalPassword role isActive"
    );

    if (!student) {
      return res.json({
        success: false,
        message: "Student not found",
      });
    }

    // ==========================================
    // STUDENT FEE RECORD
    // ==========================================

    const fee = await StudentFees.findOne({
      studentId: id,
    });

    // ==========================================
    // PAYMENTS
    // ==========================================

    let payments = [];

    if (student.status !== "TC_APPROVED") {
      payments = await StudentFeePayment.find({
        studentId: id,
      })
        .populate(
          "sessionId",
          "name startYear endYear isCurrent"
        )
        .sort({
          date: -1,
        });
    }

    // ==========================================
    // SESSION WISE FEES
    // ==========================================

    const sessionWiseFees =
      fee?.sessionWiseFees || [];

    // ==========================================
    // CURRENT SESSION
    // ==========================================

    const currentSession =
      sessionWiseFees.find(
        (sessionFee) =>
          sessionFee.sessionId?.isCurrent === true
      ) ||
      sessionWiseFees[sessionWiseFees.length - 1] ||
      null;

    // ==========================================
    // CURRENT SESSION VALUES
    // ==========================================

    const currentYearlyFee =
      Number(currentSession?.yearlyFee || 0);

    const currentPreviousYearFee =
      Number(currentSession?.previousYearFee || 0);

    const currentExamFee =
      Number(currentSession?.examFee || 0);

    const currentAdmissionFee =
      Number(currentSession?.admissionFee || 0);

    const currentSmartClassFee =
      Number(currentSession?.smartClassFee || 0);

    const currentAnnualFunctionFee =
      Number(currentSession?.annualFunctionFee || 0);

    const currentDiaryFee =
      Number(currentSession?.diaryFee || 0);

    const currentIdentityCardFee =
      Number(currentSession?.identityCardFee || 0);

    const currentPanalty =
      Number(currentSession?.panalty || 0);

    const currentOtherCharges =
      Number(currentSession?.otherCharges || 0);

    const currentTransportationFee =
      Number(currentSession?.transportationFee || 0);

    const currentDiscount =
      Number(currentSession?.discount || 0);

    const currentTotalFee =
      Number(currentSession?.totalFee || 0);

    const currentPaidAmount =
      Number(currentSession?.paidAmount || 0);

    const currentRemainingAmount =
      Number(currentSession?.remainingAmount || 0);

    const currentOtherFees =
      currentExamFee +
      currentAdmissionFee +
      currentSmartClassFee +
      currentAnnualFunctionFee +
      currentDiaryFee +
      currentIdentityCardFee +
      currentPanalty +
      currentOtherCharges +
      currentTransportationFee;

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.json({
      success: true,

      student: {
        ...student._doc,

        // ======================================
        // CURRENT SESSION FEE
        // ======================================

        yearlyFee: currentYearlyFee,

        previousYearFee:
          currentPreviousYearFee,

        examFee:
          currentExamFee,

        admissionFee:
          currentAdmissionFee,

        smartClassFee:
          currentSmartClassFee,

        annualFunctionFee:
          currentAnnualFunctionFee,

        diaryFee:
          currentDiaryFee,

        identityCardFee:
          currentIdentityCardFee,

        panalty:
          currentPanalty,

        otherCharges:
          currentOtherCharges,

        transportationFee:
          currentTransportationFee,

        otherFees:
          currentOtherFees,

        discount:
          currentDiscount,

        totalFee:
          currentTotalFee,

        totalPaid:
          currentPaidAmount,

        remainingFee:
          currentRemainingAmount,

        // ======================================
        // PAYMENT HISTORY
        // ======================================

        monthlyPayments:
          payments,

        // ======================================
        // ALL SESSION FEE HISTORY
        // ======================================

        fees: {
          sessionWiseFees:
            sessionWiseFees,
        },
      },
    });

  } catch (err) {
    console.error(
      "❌ getSingleStudentWithFeeDetails error:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch student fee details",
      error: err.message,
    });
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

const students = await Student.find({ status: "ACTIVE" }).populate("userId");

const realStudents = students.filter(
  s => s.userId && !s.userId.isTestUser
);


    const teachers = await Teacher.find();

    res.json({
      success: true,
      
       students: realStudents.filter(s => new Date(s.dateOfBirth).getDate() === d && new Date(s.dateOfBirth).getMonth() === m),
       teachers: teachers.filter(t => new Date(t.dateOfBirth).getDate() === d && new Date(t.dateOfBirth).getMonth() === m),
    });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔟 UPDATE STUDENT PROFILE */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* 🔟 UPDATE STUDENT PROFILE (STUDENT + GUARDIAN + USER) */
/* -------------------------------------------------------------------------- */
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    const user = await User.findById(student.userId);
    if (!user)
      return res.status(404).json({ success: false, message: "Linked user not found" });

    /* ================= USER ================= */
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;

    if (req.body.password && req.body.password.trim()) {
      const hashed = await bcrypt.hash(req.body.password, 10);
      user.password = hashed;
      user.originalPassword = req.body.password;
    }
    await user.save();

    /* ================= STUDENT ================= */
    const {
      guardian,
      ...studentFields
    } = req.body;

    Object.keys(studentFields).forEach(
      (k) => studentFields[k] === undefined && delete studentFields[k]
    );

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      {
        $set: {
          ...studentFields,
          guardian: guardian || null, // ✅ FULL GUARDIAN UPDATE
        },
      },
      { new: true, runValidators: true }
    ).populate("userId", "name email originalPassword");

    res.json({
      success: true,
      message: "Student updated successfully",
      student: updatedStudent,
    });

  } catch (err) {
    console.error("❌ updateStudent error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



/* -------------------------------------------------------------------------- */
/* 🗑️ DELETE STUDENT COMPLETELY */
/* -------------------------------------------------------------------------- */
export const deleteStudentCompletely = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Find student first
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const userId = student.userId; // 👈 save before delete

    // 🧹 Delete related collections
    await StudentFees.deleteMany({ studentId: id });
    await StudentFeePayment.deleteMany({ studentId: id });
    await FeeHistory.deleteMany({ studentId: id });

    // 🗂️ Archive / old data cleanup
    await deleteOldStudentData(id, student.studentclass);

    // ❌ Delete student
    await Student.findByIdAndDelete(id);

    // ❌ Delete linked user account
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    res.json({
      success: true,
      message: "Student and user deleted completely",
    });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete student completely",
    });
  }
};



/* 🟢 ACTIVE STUDENTS */
export const getActiveStudents = async (req, res) => {

  try {
    const { class: classFilter, search, fee} = req.query;

let query = { status: "ACTIVE" };

if (classFilter) {
  query.studentclass = classFilter;
}

if (search) {
  query.fullName = { $regex: search, $options: "i" };
}

  const total = await Student.countDocuments(query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // 🔥 STEP 1: Fetch students WITH userId
const students = await Student.find(query)
      .populate("userId", "isTestUser")
      .select("fullName studentclass studentFatherName contact1 userId")
       .sort({ fullName: 1 }) 
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // 🔥 STEP 2: Filter real students
    const activeStudents = students.filter(
      (s) => s.userId && !s.userId.isTestUser
    );

    const studentIds = activeStudents.map((s) => s._id);

    // 🔥 STEP 3: Fetch all related data (NO LOOP QUERY)
    const [fees, payments, classFees] = await Promise.all([
      StudentFees.find({ studentId: { $in: studentIds } }).lean(),
      StudentFeePayment.find({ studentId: { $in: studentIds } }).lean(),
      ClassFeeMaster.find().lean(), // ✅ ALL class fees
    ]);

    // 🔥 STEP 4: Build maps (FAST lookup)
    const classFeeMap = {};
    classFees.forEach((c) => {
      classFeeMap[c.className] = c;
    });

    const paymentMap = {};
    payments.forEach((p) => {
      const id = p.studentId.toString();
      if (!paymentMap[id]) paymentMap[id] = 0;
      paymentMap[id] += p.paidAmount || 0;
    });

    const feeMap = {};
    fees.forEach((f) => {
      feeMap[f.studentId.toString()] = f;
    });

    // 🔥 STEP 5: Build final data (NO extra DB call)
    const data = activeStudents.map((s) => {
      const id = s._id.toString();

      const fee = feeMap[id];
      const classFee = classFeeMap[s.studentclass];

      const effective = getEffectiveFee(fee, classFee);
      const totalPaid = paymentMap[id] || 0;

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
transportationFee:effective.transportationFee,
        totalPaid,
        remainingFee: effective.totalFee - totalPaid,
      };
    });

    res.json({
      success: true,
      page,
      total,
      count: data.length,
      students: data,
    });

  } catch (err) {
    console.error("❌ getActiveStudents error:", err);
    res.status(500).json({ success: false });
  }
};


/* 🔴 TC APPROVED STUDENTS */
export const getTCStudents = async (req, res) => {
  try {
const students = await Student.find({ status: "TC_APPROVED" }).sort({ fullName: 1 }).populate("userId");

const realStudents = students.filter(
  s => s.userId && !s.userId.isTestUser
);


    const fees = await StudentFees.find();
  

    const data = await Promise.all(
      realStudents.map(async (s) => {
        const fee = fees.find(
          (f) => f.studentId.toString() === s._id.toString()
        );

        const classFee = await ClassFeeMaster.findOne({
          className: s.studentclass,
        });

        const effective = getEffectiveFee(fee, classFee);

const tc = await TransferCertificate.findOne({ studentId: s._id });

const totalPaid = tc?.totalPaidAmount || 0;


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

