import StudentFeePayment from "../models/StudentFeePayment.js";
import Counter from "../models/Counter.js";
import StudentFees from "../models/StudentFees.js";
import AcademicSession from "../models/AcademicSession.js";
import { syncStudentFeeChain } from "../services/studentFeeSyncService.js";
// ========================================
// ADD PAYMENT
// ========================================

export const addPayment = async (req, res) => {
  try {
    const {
  studentId,
  paidAmount,
  installment,
  year,
  sessionId,
} = req.body;

if (
  !studentId ||
  !paidAmount ||
  !installment ||
  !year ||
  !sessionId
) {
  return res.status(400).json({
    success: false,
    message:
      "StudentId, paidAmount, installment, year and sessionId are required",
  });
}

    /* ==========================================
       1. CURRENT ACADEMIC SESSION
    ========================================== */

const selectedSession =
  await AcademicSession.findById(sessionId);

if (!selectedSession) {
  return res.status(400).json({
    success: false,
    message: "Selected academic session not found",
  });
}


    /* ==========================================
       2. CHECK STUDENT
    ========================================== */

    const feeRecord =
      await StudentFees.findOne({
        studentId,
      });

    if (!feeRecord) {
      return res.status(404).json({
        success: false,
        message:
          "Student fee record not found",
      });
    }

    /* ==========================================
       3. CURRENT SESSION SNAPSHOT
    ========================================== */

/* ==========================================
   3. SELECTED SESSION FEE SNAPSHOT
========================================== */

const sessionFee =
  feeRecord.sessionWiseFees.find(
    (item) =>
      item.sessionId?.toString() ===
      sessionId.toString()
  );

if (!sessionFee) {
  return res.status(400).json({
    success: false,
    message:
      `Fee snapshot not found for selected session ${selectedSession.name}`,
  });
}

    /* ==========================================
       4. RECEIPT NUMBER
    ========================================== */

    const counter =
      await Counter.findOneAndUpdate(
        { _id: "studentFeeReceipt" },
        { $inc: { seq: 1 } },
        {
          new: true,
          upsert: true,
        }
      );

    const receiptNumber = counter.seq;

    /* ==========================================
       5. CREATE PAYMENT
    ========================================== */

    const payment =
      new StudentFeePayment({
        studentId,

        paidAmount:
          Number(paidAmount),

        installment,

        year:
          Number(year),

        // SESSION
        sessionId: selectedSession._id,
        receiptNumber,
      });

    await payment.save();

    /* ==========================================
       6. RECALCULATE CURRENT SESSION PAYMENTS
    ========================================== */

const sessionPayments =
  await StudentFeePayment.find({
    studentId,
    sessionId: selectedSession._id,
  });

    const totalPaid =
      sessionPayments.reduce(
        (sum, payment) =>
          sum +
          Number(payment.paidAmount || 0),
        0
      );

    /* ==========================================
       7. UPDATE SESSION SNAPSHOT
    ========================================== */

    sessionFee.paidAmount =
      totalPaid;

    sessionFee.remainingAmount =
      Math.max(
        Number(sessionFee.totalFee || 0) -
          totalPaid,
        0
      );

    await feeRecord.save();

await syncStudentFeeChain(studentId);
    /* ==========================================
       8. RESPONSE
    ========================================== */

    return res.status(201).json({
      success: true,

      message:
        "Payment added successfully",

      payment,

  session: {
  _id: selectedSession._id,
  name: selectedSession.name,
},

      sessionFee: {
        totalFee:
          sessionFee.totalFee,

        paidAmount:
          sessionFee.paidAmount,

        remainingAmount:
          sessionFee.remainingAmount,
      },
    });
  } catch (err) {
    console.error(
      "ADD PAYMENT ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Error adding payment",
      error: err.message,
    });
  }
};
// 📌 Get all payments of a student
export const getPaymentsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

   const payments =
  await StudentFeePayment.find({ studentId })
    .populate("sessionId", "name startYear endYear isCurrent")
    .sort({ date: -1 });

    res.status(200).json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching payments", error: err.message });
  }
};

// 📌 Update a payment
export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment =
      await StudentFeePayment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Receipt number kabhi change nahi hoga
    if (req.body.receiptNumber !== undefined) {
      return res.status(400).json({
        success: false,
        message: "Receipt number cannot be changed",
      });
    }

    // Sirf ye fields update ho sakti hain
    const allowedFields = [
      "paidAmount",
      "year",
      "installment",
      "date",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        payment[field] = req.body[field];
      }
    });

await payment.save();

/* ==========================================
   RECALCULATE SESSION PAYMENT
========================================== */

const feeRecord =
  await StudentFees.findOne({
    studentId: payment.studentId,
  });

if (feeRecord && payment.sessionId) {
  const sessionFee =
    feeRecord.sessionWiseFees.find(
      (item) =>
        item.sessionId?.toString() ===
        payment.sessionId.toString()
    );

  if (sessionFee) {
    const sessionPayments =
      await StudentFeePayment.find({
        studentId: payment.studentId,
        sessionId: payment.sessionId,
      });

    const totalPaid =
      sessionPayments.reduce(
        (sum, p) =>
          sum + Number(p.paidAmount || 0),
        0
      );

    sessionFee.paidAmount = totalPaid;

    sessionFee.remainingAmount =
      Math.max(
        Number(sessionFee.totalFee || 0) -
          totalPaid,
        0
      );

    await feeRecord.save();
  }
}

// ✅ Recalculate chain AFTER session payment is updated
await syncStudentFeeChain(payment.studentId);
return res.status(200).json({
      success: true,
      message: "Payment updated",
      payment,
    });

  } catch (err) {
    console.error(
      "UPDATE PAYMENT ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Error updating payment",
      error: err.message,
    });
  }
};
// 📌 Delete a payment
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted =
      await StudentFeePayment.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    /* ==========================================
       RECALCULATE SAME SESSION
    ========================================== */

    const feeRecord =
      await StudentFees.findOne({
        studentId: deleted.studentId,
      });

    if (feeRecord) {
      const sessionFee =
        feeRecord.sessionWiseFees.find(
          (item) =>
            item.sessionId?.toString() ===
            deleted.sessionId?.toString()
        );

      if (sessionFee) {
        const sessionPayments =
          await StudentFeePayment.find({
            studentId:
              deleted.studentId,

            sessionId:
              deleted.sessionId,
          });

        const totalPaid =
          sessionPayments.reduce(
            (sum, payment) =>
              sum +
              Number(
                payment.paidAmount || 0
              ),
            0
          );

        sessionFee.paidAmount =
          totalPaid;

        sessionFee.remainingAmount =
          Math.max(
            Number(
              sessionFee.totalFee || 0
            ) - totalPaid,
            0
          );

        await feeRecord.save();
 
await syncStudentFeeChain(
  deleted.studentId
);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Payment deleted",
    });
  } catch (err) {
    console.error(
      "DELETE PAYMENT ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Error deleting payment",
      error: err.message,
    });
  }
};