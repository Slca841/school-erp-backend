import AcademicSession from "../models/AcademicSession.js";
import Student from "../models/StudentModel.js";
import StudentFees from "../models/StudentFees.js";
import StudentFeePayment from "../models/StudentFeePayment.js";
import ClassFeeMaster from "../models/ClassFeeMaster.js";

/* =========================================================
   CREATE AUTOMATIC FEE SNAPSHOT FOR CURRENT SESSION
========================================================= */

const createCurrentSessionFeeSnapshots = async (session) => {
  try {
    // Sirf active students
    const students = await Student.find({
      status: "ACTIVE",
    }).populate("userId");

    // Test users ko exclude karo
    const realStudents = students.filter(
      (student) =>
        student.userId &&
        !student.userId.isTestUser
    );

    // Saare class fee masters ek baar me
    const classFees = await ClassFeeMaster.find();

    const classFeeMap = {};

    classFees.forEach((fee) => {
      classFeeMap[fee.className] = fee;
    });

    let createdCount = 0;
    let skippedCount = 0;

    for (const student of realStudents) {
      try {
        /* ==========================================
           1. CLASS FEE MASTER
        ========================================== */

        const classFee =
          classFeeMap[student.studentclass];

        if (!classFee) {
          console.warn(
            `Fee master not found for class: ${student.studentclass}, student: ${student.fullName}`
          );

          skippedCount++;
          continue;
        }

        /* ==========================================
           2. STUDENT FEE RECORD
        ========================================== */

        let feeRecord =
          await StudentFees.findOne({
            studentId: student._id,
          });

        if (!feeRecord) {
          feeRecord = new StudentFees({
            studentId: student._id,
            sessionWiseFees: [],
          });
        }

        /* ==========================================
           3. CHECK CURRENT SESSION SNAPSHOT
        ========================================== */

        const existingSnapshot =
          feeRecord.sessionWiseFees?.find(
            (item) =>
              item.sessionId?.toString() ===
              session._id.toString()
          );

        // Agar already bana hua hai to kuch mat karo
        if (existingSnapshot) {
          skippedCount++;
          continue;
        }

        /* ==========================================
           4. PREVIOUS SESSION
        ========================================== */

        const previousSession =
          await AcademicSession.findOne({
            startYear: {
              $lt: session.startYear,
            },
          }).sort({
            startYear: -1,
          });

        let previousYearFee = 0;

        if (previousSession) {
          const previousSnapshot =
            feeRecord.sessionWiseFees?.find(
              (item) =>
                item.sessionId?.toString() ===
                previousSession._id.toString()
            );

          if (previousSnapshot) {
            previousYearFee = Number(
              previousSnapshot.remainingAmount || 0
            );
          }
        }

        /* ==========================================
           5. CLASS FEE MASTER VALUES
        ========================================== */

        const yearlyFee =
          Number(classFee.yearlyFee || 0);

        const examFee =
          Number(classFee.examFee || 0);

        const admissionFee =
          Number(classFee.admissionFee || 0);

        const smartClassFee =
          Number(classFee.smartClassFee || 0);

        const annualFunctionFee =
          Number(classFee.annualFunctionFee || 0);

        const diaryFee =
          Number(classFee.diaryFee || 0);

        const identityCardFee =
          Number(classFee.identityCardFee || 0);

        const panalty =
          Number(classFee.panalty || 0);

        const otherCharges =
          Number(classFee.otherCharges || 0);

        const transportationFee =
          Number(classFee.transportationFee || 0);

        /* ==========================================
           6. TOTAL CURRENT SESSION FEE
        ========================================== */

        const totalFee =
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
          transportationFee;

        /* ==========================================
           7. CURRENT SESSION PAYMENTS
        ========================================== */

        const payments =
          await StudentFeePayment.find({
            studentId: student._id,
            sessionId: session._id,
          });

        const paidAmount =
          payments.reduce(
            (sum, payment) =>
              sum +
              Number(payment.paidAmount || 0),
            0
          );

        const remainingAmount =
          Math.max(
            totalFee - paidAmount,
            0
          );

        /* ==========================================
           8. CREATE SESSION SNAPSHOT
        ========================================== */

        feeRecord.sessionWiseFees.push({
          sessionId: session._id,
          sessionName: session.name,

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

          discount: 0,

          totalFee,

          paidAmount,

          remainingAmount,
        });

        await feeRecord.save();

        createdCount++;

        console.log(
          `✅ Fee snapshot created: ${student.fullName} → ${session.name}`
        );
      } catch (studentError) {
        console.error(
          `❌ Fee snapshot error for student ${student.fullName}:`,
          studentError
        );
      }
    }

    console.log(
      `📊 Session ${session.name}: ${createdCount} created, ${skippedCount} skipped`
    );

    return {
      createdCount,
      skippedCount,
    };
  } catch (error) {
    console.error(
      "❌ createCurrentSessionFeeSnapshots error:",
      error
    );

    throw error;
  }
};


/* =========================================================
   CREATE ACADEMIC SESSION
========================================================= */

export const createAcademicSession = async (req, res) => {
  try {
    const {
      name,
      startYear,
      endYear,
      isCurrent,
    } = req.body;

    /* ==========================================
       VALIDATION
    ========================================== */

    if (!name || !startYear || !endYear) {
      return res.status(400).json({
        success: false,
        message:
          "Session name, start year and end year are required",
      });
    }

    /* ==========================================
       DUPLICATE CHECK
    ========================================== */

    const existing =
      await AcademicSession.findOne({
        name,
      });

    if (existing) {
      return res.status(400).json({
        success: false,
        message:
          "Academic session already exists",
      });
    }

    /* ==========================================
       CLOSE OLD CURRENT SESSION
    ========================================== */

    if (isCurrent) {
      await AcademicSession.updateMany(
        {},
        {
          $set: {
            isCurrent: false,
            status: "CLOSED",
          },
        }
      );
    }

    /* ==========================================
       CREATE SESSION
    ========================================== */

    const session =
      await AcademicSession.create({
        name,
        startYear,
        endYear,
        isCurrent: !!isCurrent,
        status: isCurrent
          ? "ACTIVE"
          : "CLOSED",
      });

    /* ==========================================
       AUTOMATIC FEE CREATION
       
       ONLY CURRENT SESSION
    ========================================== */

    let feeSnapshotResult = {
      createdCount: 0,
      skippedCount: 0,
    };

    if (isCurrent) {
      feeSnapshotResult =
        await createCurrentSessionFeeSnapshots(
          session
        );
    }

    /* ==========================================
       RESPONSE
    ========================================== */

    return res.status(201).json({
      success: true,

      message:
        "Academic session created successfully",

      session,

      feeSnapshots:
        feeSnapshotResult,
    });
  } catch (error) {
    console.error(
      "Create academic session error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create academic session",
      error: error.message,
    });
  }
};


/* =========================================================
   GET ALL ACADEMIC SESSIONS
========================================================= */

export const getAcademicSessions = async (
  req,
  res
) => {
  try {
    const sessions =
      await AcademicSession.find().sort({
        startYear: 1,
      });

    return res.json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error(
      "Get academic sessions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch academic sessions",
    });
  }
};


/* =========================================================
   GET CURRENT ACADEMIC SESSION
========================================================= */

export const getCurrentAcademicSession =
  async (req, res) => {
    try {
      const session =
        await AcademicSession.findOne({
          isCurrent: true,
          status: "ACTIVE",
        });

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Current academic session not found",
        });
      }

      return res.json({
        success: true,
        session,
      });
    } catch (error) {
      console.error(
        "Get current session error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch current session",
      });
    }
  };
  export const generateCurrentSessionFees = async (req, res) => {
  try {
    const session = await AcademicSession.findOne({
      isCurrent: true,
      status: "ACTIVE",
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Current academic session not found",
      });
    }

    const result = await createCurrentSessionFeeSnapshots(
      session
    );

    return res.json({
      success: true,
      message: `Fees generated for current session ${session.name}`,
      session,
      feeSnapshots: result,
    });
  } catch (error) {
    console.error(
      "Generate current session fees error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate current session fees",
      error: error.message,
    });
  }
};