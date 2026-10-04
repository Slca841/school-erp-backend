  import AcademicSession from "../models/AcademicSession.js";
  import Student from "../models/StudentModel.js";
  import StudentFees from "../models/StudentFees.js";
  import StudentFeePayment from "../models/StudentFeePayment.js";
  import ClassFeeMaster from "../models/ClassFeeMaster.js";

  const getNumber = (value) => Number(value || 0);

  const getFeeValue = (studentValue, masterValue) => {
    const student = getNumber(studentValue);
    const master = getNumber(masterValue);

    return student > 0 ? student : master;
  };

  export const syncStudentCurrentSessionFee = async (studentId) => {
    const student = await Student.findById(studentId);

    if (!student) {
      throw new Error("Student not found");
    }

    const currentSession = await AcademicSession.findOne({
      isCurrent: true,
      status: "ACTIVE",
    });

    if (!currentSession) {
      throw new Error("Current academic session not found");
    }

    const className = student.studentclass?.trim();

    if (!className) {
      throw new Error("Student class not found");
    }

    const classFee = await ClassFeeMaster.findOne({
      className: {
        $regex: `^${className.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        )}$`,
        $options: "i",
      },
    });

    if (!classFee) {
      throw new Error(
        `Fee structure not found for class ${className}`
      );
    }

    let feeRecord = await StudentFees.findOne({
      studentId,
    });

    if (!feeRecord) {
      feeRecord = new StudentFees({
        studentId,
        sessionWiseFees: [],
      });
    }

    // ==========================================
    // PREVIOUS SESSION
    // ==========================================

    const previousSession = await AcademicSession.findOne({
      startYear: {
        $lt: currentSession.startYear,
      },
    }).sort({
      startYear: -1,
    });

    let previousYearFee = 0;

    if (previousSession) {
      const previousSnapshot =
        feeRecord.sessionWiseFees.find(
          (item) =>
            item.sessionId?.toString() ===
            previousSession._id.toString()
        );

      previousYearFee = getNumber(
        previousSnapshot?.remainingAmount
      );
    }

    // ==========================================
    // CURRENT FEES
    // ==========================================

    const yearlyFee = getNumber(
      classFee.yearlyFee
    );

    const examFee = getFeeValue(
      feeRecord.examFee,
      classFee.examFee
    );

    const admissionFee = getFeeValue(
      feeRecord.admissionFee,
      classFee.admissionFee
    );

    const smartClassFee = getFeeValue(
      feeRecord.smartClassFee,
      classFee.smartClassFee
    );

    const annualFunctionFee = getFeeValue(
      feeRecord.annualFunctionFee,
      classFee.annualFunctionFee
    );

    const diaryFee = getFeeValue(
      feeRecord.diaryFee,
      classFee.diaryFee
    );

    const identityCardFee = getFeeValue(
      feeRecord.identityCardFee,
      classFee.identityCardFee
    );

    const panalty = getFeeValue(
      feeRecord.panalty,
      classFee.panalty
    );

    const otherCharges = getFeeValue(
      feeRecord.otherCharges,
      classFee.otherCharges
    );

    const transportationFee = getFeeValue(
      feeRecord.transportationFee,
      classFee.transportationFee
    );

    const discount = getNumber(
      feeRecord.discount
    );

    // ==========================================
    // TOTAL
    // ==========================================

    const totalFee = Math.max(
      yearlyFee +
        previousYearFee +
        examFee +
        admissionFee +
        smartClassFee +
        annualFunctionFee +
        diaryFee +
        identityCardFee +
        panalty +
        otherCharges +
        transportationFee -
        discount,
      0
    );

    // ==========================================
    // PAYMENTS
    // ==========================================

    const payments = await StudentFeePayment.find({
      studentId,
      sessionId: currentSession._id,
    });

    const paidAmount = payments.reduce(
      (sum, payment) =>
        sum + getNumber(payment.paidAmount),
      0
    );

    const remainingAmount = Math.max(
      totalFee - paidAmount,
      0
    );

    // ==========================================
    // SNAPSHOT
    // ==========================================

    const snapshotData = {
      sessionId: currentSession._id,
      sessionName: currentSession.name,

      yearlyFee,
      previousYearFee,

      examFee,
      admissionFee,
      smartClassFee,
      annualFunctionFee,
      diaryFee,
      identityCardFee,
      panalty,
      otherCharges,
      transportationFee,

      discount,

      totalFee,
      paidAmount,
      remainingAmount,
    };

    // ==========================================
    // CREATE / UPDATE
    // ==========================================

    const existingSnapshot =
      feeRecord.sessionWiseFees.find(
        (item) =>
          item.sessionId?.toString() ===
          currentSession._id.toString()
      );

    if (existingSnapshot) {
      Object.assign(
        existingSnapshot,
        snapshotData
      );
    } else {
      feeRecord.sessionWiseFees.push(
        snapshotData
      );
    }

    // ==========================================
    // ROOT FIELDS
    // ==========================================

    feeRecord.previousYearFee =
      previousYearFee;

    feeRecord.examFee =
      examFee;

    feeRecord.admissionFee =
      admissionFee;

    feeRecord.smartClassFee =
      smartClassFee;

    feeRecord.annualFunctionFee =
      annualFunctionFee;

    feeRecord.diaryFee =
      diaryFee;

    feeRecord.identityCardFee =
      identityCardFee;

    feeRecord.panalty =
      panalty;

    feeRecord.otherCharges =
      otherCharges;

    feeRecord.transportationFee =
      transportationFee;

    feeRecord.discount =
      discount;

    await feeRecord.save();

    return {
      feeRecord,
      snapshot:
        feeRecord.sessionWiseFees.find(
          (item) =>
            item.sessionId?.toString() ===
            currentSession._id.toString()
        ),
    };
  };
export const syncStudentFeeChain = async (studentId) => {
  const student = await Student.findById(studentId);

  if (!student) {
    throw new Error("Student not found");
  }

  let feeRecord = await StudentFees.findOne({ studentId });

  if (!feeRecord) {
    feeRecord = new StudentFees({
      studentId,
      sessionWiseFees: [],
    });
  }

  // ==========================================
  // ALL SESSIONS - CHRONOLOGICAL
  // ==========================================

  const sessions = await AcademicSession.find({
    status: { $in: ["ACTIVE", "CLOSED"] },
  }).sort({
    startYear: 1,
  });

  if (!sessions.length) {
    await feeRecord.save();
    return feeRecord;
  }

  // ==========================================
  // CURRENT STUDENT CLASS
  // ==========================================

  const className = student.studentclass?.trim();

  if (!className) {
    throw new Error("Student class not found");
  }

  const classFee = await ClassFeeMaster.findOne({
    className: {
      $regex: `^${className.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      )}$`,
      $options: "i",
    },
  });

  // ==========================================
  // SESSION CHAIN
  // ==========================================

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];

    // ------------------------------------------
    // FIND EXISTING SNAPSHOT
    // ------------------------------------------

    let currentSnapshot =
      feeRecord.sessionWiseFees.find(
        (item) =>
          item.sessionId?.toString() ===
          session._id.toString()
      );

    // ------------------------------------------
    // PREVIOUS SESSION REMAINING
    // ------------------------------------------

    let previousYearFee = 0;

    if (i > 0) {
      const previousSession = sessions[i - 1];

      const previousSnapshot =
        feeRecord.sessionWiseFees.find(
          (item) =>
            item.sessionId?.toString() ===
            previousSession._id.toString()
        );

      previousYearFee = Number(
        previousSnapshot?.remainingAmount || 0
      );
    }

    // ==========================================
    // CREATE MISSING SNAPSHOT
    // ==========================================

    if (!currentSnapshot) {
      currentSnapshot = {
        sessionId: session._id,
        sessionName: session.name,

        yearlyFee: 0,
        previousYearFee,

        examFee: 0,
        admissionFee: 0,
        smartClassFee: 0,
        annualFunctionFee: 0,
        diaryFee: 0,
        identityCardFee: 0,
        panalty: 0,
        otherCharges: 0,
        transportationFee: 0,

        discount: 0,

        totalFee: 0,
        paidAmount: 0,
        remainingAmount: 0,
      };

      // ------------------------------------------
      // CURRENT SESSION
      // ------------------------------------------

      const currentSession =
        await AcademicSession.findOne({
          isCurrent: true,
          status: "ACTIVE",
        });

      if (
        currentSession &&
        session._id.toString() ===
          currentSession._id.toString()
      ) {
        if (classFee) {
          currentSnapshot.yearlyFee =
            Number(classFee.yearlyFee || 0);

          currentSnapshot.examFee =
            Number(classFee.examFee || 0);

          currentSnapshot.admissionFee =
            Number(classFee.admissionFee || 0);

          currentSnapshot.smartClassFee =
            Number(classFee.smartClassFee || 0);

          currentSnapshot.annualFunctionFee =
            Number(classFee.annualFunctionFee || 0);

          currentSnapshot.diaryFee =
            Number(classFee.diaryFee || 0);

          currentSnapshot.identityCardFee =
            Number(classFee.identityCardFee || 0);

          currentSnapshot.panalty =
            Number(classFee.panalty || 0);

          currentSnapshot.otherCharges =
            Number(classFee.otherCharges || 0);

          currentSnapshot.transportationFee =
            Number(classFee.transportationFee || 0);
        }

        // Student-specific overrides
        currentSnapshot.examFee =
          getFeeValue(
            feeRecord.examFee,
            currentSnapshot.examFee
          );

        currentSnapshot.admissionFee =
          getFeeValue(
            feeRecord.admissionFee,
            currentSnapshot.admissionFee
          );

        currentSnapshot.smartClassFee =
          getFeeValue(
            feeRecord.smartClassFee,
            currentSnapshot.smartClassFee
          );

        currentSnapshot.annualFunctionFee =
          getFeeValue(
            feeRecord.annualFunctionFee,
            currentSnapshot.annualFunctionFee
          );

        currentSnapshot.diaryFee =
          getFeeValue(
            feeRecord.diaryFee,
            currentSnapshot.diaryFee
          );

        currentSnapshot.identityCardFee =
          getFeeValue(
            feeRecord.identityCardFee,
            currentSnapshot.identityCardFee
          );

        currentSnapshot.panalty =
          getFeeValue(
            feeRecord.panalty,
            currentSnapshot.panalty
          );

        currentSnapshot.otherCharges =
          getFeeValue(
            feeRecord.otherCharges,
            currentSnapshot.otherCharges
          );

        currentSnapshot.transportationFee =
          getFeeValue(
            feeRecord.transportationFee,
            currentSnapshot.transportationFee
          );

        currentSnapshot.discount =
          Number(feeRecord.discount || 0);
      }

      feeRecord.sessionWiseFees.push(
        currentSnapshot
      );
    }

    // ==========================================
    // ALWAYS REFRESH PREVIOUS YEAR
    // ==========================================

    currentSnapshot.previousYearFee =
      previousYearFee;

    // ==========================================
    // TOTAL FEE
    // ==========================================

    const totalFee = Math.max(
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
        Number(currentSnapshot.discount || 0),
      0
    );

    currentSnapshot.totalFee = totalFee;

    // ==========================================
    // PAYMENTS
    // ==========================================

    const payments =
      await StudentFeePayment.find({
        studentId,
        sessionId: session._id,
      });

    const paidAmount = payments.reduce(
      (sum, payment) =>
        sum + Number(payment.paidAmount || 0),
      0
    );

    currentSnapshot.paidAmount =
      paidAmount;

    // ==========================================
    // REMAINING
    // ==========================================

    currentSnapshot.remainingAmount =
      Math.max(
        totalFee - paidAmount,
        0
      );
  }

  // ==========================================
  // CURRENT SESSION ROOT FIELDS
  // ==========================================

  const currentSession =
    await AcademicSession.findOne({
      isCurrent: true,
      status: "ACTIVE",
    });

  if (currentSession) {
    const currentSnapshot =
      feeRecord.sessionWiseFees.find(
        (item) =>
          item.sessionId?.toString() ===
          currentSession._id.toString()
      );

    if (currentSnapshot) {
      feeRecord.previousYearFee =
        currentSnapshot.previousYearFee;

      feeRecord.examFee =
        currentSnapshot.examFee;

      feeRecord.admissionFee =
        currentSnapshot.admissionFee;

      feeRecord.smartClassFee =
        currentSnapshot.smartClassFee;

      feeRecord.annualFunctionFee =
        currentSnapshot.annualFunctionFee;

      feeRecord.diaryFee =
        currentSnapshot.diaryFee;

      feeRecord.identityCardFee =
        currentSnapshot.identityCardFee;

      feeRecord.panalty =
        currentSnapshot.panalty;

      feeRecord.otherCharges =
        currentSnapshot.otherCharges;

      feeRecord.transportationFee =
        currentSnapshot.transportationFee;

      feeRecord.discount =
        currentSnapshot.discount;
    }
  }

  // ==========================================
  // ONE FINAL SAVE
  // ==========================================

  await feeRecord.save();

  return feeRecord;
};