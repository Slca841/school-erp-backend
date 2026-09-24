import StudentFees from "../models/StudentFees.js";
import AcademicSession from "../models/AcademicSession.js";

export const saveStudentSessionFee = async (req, res) => {
  try {
    const { studentId, sessionId } = req.params;

    // ==========================================
    // GET SELECTED SESSION
    // ==========================================

    const session = await AcademicSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Academic session not found",
      });
    }

    // ==========================================
    // GET / CREATE STUDENT FEES
    // ==========================================

    let studentFees = await StudentFees.findOne({
      studentId,
    });

    if (!studentFees) {
      studentFees = new StudentFees({
        studentId,
        sessionWiseFees: [],
      });
    }

    // ==========================================
    // FIND PREVIOUS SESSION
    // ==========================================

    const previousSession = await AcademicSession.findOne({
      startYear: { $lt: session.startYear },
    }).sort({
      startYear: -1,
    });

    // ==========================================
    // PREVIOUS YEAR FEE
    // ==========================================

    let previousYearFee = 0;

    if (previousSession) {
      const previousFeeSnapshot =
        studentFees.sessionWiseFees.find(
          (item) =>
            item.sessionId?.toString() ===
            previousSession._id.toString()
        );

      if (previousFeeSnapshot) {
        previousYearFee = Number(
          previousFeeSnapshot.remainingAmount || 0
        );
      }
    }

    // ==========================================
    // BODY
    // ==========================================

    const {
      yearlyFee = 0,
      examFee = 0,
      admissionFee = 0,
      smartClassFee = 0,
      annualFunctionFee = 0,
      diaryFee = 0,
      identityCardFee = 0,
      panalty = 0,
      otherCharges = 0,
      transportationFee = 0,
      discount = 0,
      paidAmount = 0,
    } = req.body;

    // ==========================================
    // NORMALIZE NUMBERS
    // ==========================================

    const yearly = Number(yearlyFee) || 0;
    const exam = Number(examFee) || 0;
    const admission = Number(admissionFee) || 0;
    const smartClass = Number(smartClassFee) || 0;
    const annualFunction = Number(annualFunctionFee) || 0;
    const diary = Number(diaryFee) || 0;
    const identityCard = Number(identityCardFee) || 0;
    const penalty = Number(panalty) || 0;
    const other = Number(otherCharges) || 0;
    const transportation = Number(transportationFee) || 0;
    const discountAmount = Number(discount) || 0;
    const paid = Number(paidAmount) || 0;

    // ==========================================
    // TOTAL FEE
    // ==========================================

    const totalFee =
      yearly +
      previousYearFee +
      exam +
      admission +
      smartClass +
      annualFunction +
      diary +
      identityCard +
      penalty +
      other +
      transportation -
      discountAmount;

    // ==========================================
    // REMAINING
    // ==========================================

    const remainingAmount = Math.max(
      totalFee - paid,
      0
    );

    // ==========================================
    // SESSION SNAPSHOT
    // ==========================================

    const snapshot = {
      sessionId: session._id,
      sessionName: session.name,

      yearlyFee: yearly,

      // 🔥 AUTO
      previousYearFee,

      examFee: exam,
      admissionFee: admission,
      smartClassFee: smartClass,
      annualFunctionFee: annualFunction,
      diaryFee: diary,
      identityCardFee: identityCard,
      panalty: penalty,
      otherCharges: other,
      transportationFee: transportation,

      discount: discountAmount,

      totalFee,
      paidAmount: paid,
      remainingAmount,
    };

    // ==========================================
    // FIND EXISTING SESSION SNAPSHOT
    // ==========================================

    const existingIndex =
      studentFees.sessionWiseFees.findIndex(
        (item) =>
          item.sessionId?.toString() ===
          sessionId.toString()
      );

    if (existingIndex !== -1) {
      // UPDATE EXISTING SESSION
      studentFees.sessionWiseFees[existingIndex] =
        snapshot;
    } else {
      // CREATE NEW SESSION
      studentFees.sessionWiseFees.push(snapshot);
    }

    await studentFees.save();

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.json({
      success: true,
      message: "Session fee saved successfully",
      sessionFee: snapshot,
    });

  } catch (error) {
    console.error(
      "Save student session fee error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to save session fee",
    });
  }
};