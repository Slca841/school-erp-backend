import AcademicSession from "../models/AcademicSession.js";
import Student from "../models/StudentModel.js";
import StudentFees from "../models/StudentFees.js";
import StudentFeePayment from "../models/StudentFeePayment.js";
import ClassFeeMaster from "../models/ClassFeeMaster.js";

/* =========================================================
   CREATE AUTOMATIC FEE SNAPSHOT FOR CURRENT SESSION
========================================================= */
const createCurrentSessionFeeSnapshots = async (
  session,
  studentId = null
) => {
  try {
const students = studentId
  ? await Student.find({
      _id: studentId,
      status: "ACTIVE",
    })
  : await Student.find({
      status: "ACTIVE",
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      try {
        // ==========================================
        // 1. STUDENT FEE RECORD
        // ==========================================

        let studentFees = await StudentFees.findOne({
          studentId: student._id,
        });

        if (!studentFees) {
          studentFees = new StudentFees({
            studentId: student._id,
            sessionWiseFees: [],
          });
        }

        // ==========================================
        // 2. STUDENT CLASS
        // ==========================================

        const studentClass =
          student.studentclass?.trim();

        if (!studentClass) {
          console.log(
            `⚠️ Student class missing: ${student._id}`
          );

          skippedCount++;
          continue;
        }

        // ==========================================
        // 3. FIND CLASS FEE MASTER
        // ==========================================

        const escapedClassName =
          studentClass.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

        const classFee =
          await ClassFeeMaster.findOne({
            className: {
              $regex: `^${escapedClassName}$`,
              $options: "i",
            },
          });

        if (!classFee) {
          console.log(
            `⚠️ ClassFeeMaster NOT FOUND`,
            {
              studentId: student._id,
              studentClass,
            }
          );

          skippedCount++;
          continue;
        }

        console.log(
          `✅ Class fee found for ${studentClass}`,
          {
            yearlyFee: classFee.yearlyFee,
            examFee: classFee.examFee,
          }
        );

        // ==========================================
        // 4. STUDENT VALUE > 0
        //    OTHERWISE CLASS MASTER
        // ==========================================

        const getFeeValue = (
          studentValue,
          masterValue
        ) => {
          const sValue =
            Number(studentValue || 0);

          const mValue =
            Number(masterValue || 0);

          return sValue > 0
            ? sValue
            : mValue;
        };

        // ==========================================
        // 5. FEES
        // ==========================================

   const yearlyFee = Number(classFee.yearlyFee || 0);

        const examFee =
          getFeeValue(
            studentFees.examFee,
            classFee.examFee
          );

        const admissionFee =
          getFeeValue(
            studentFees.admissionFee,
            classFee.admissionFee
          );

        const smartClassFee =
          getFeeValue(
            studentFees.smartClassFee,
            classFee.smartClassFee
          );

        const annualFunctionFee =
          getFeeValue(
            studentFees.annualFunctionFee,
            classFee.annualFunctionFee
          );

        const diaryFee =
          getFeeValue(
            studentFees.diaryFee,
            classFee.diaryFee
          );

        const identityCardFee =
          getFeeValue(
            studentFees.identityCardFee,
            classFee.identityCardFee
          );

        const panalty =
          getFeeValue(
            studentFees.panalty,
            classFee.panalty
          );

        const otherCharges =
          getFeeValue(
            studentFees.otherCharges,
            classFee.otherCharges
          );

        const transportationFee =
          getFeeValue(
            studentFees.transportationFee,
            classFee.transportationFee
          );

        // ==========================================
        // 6. PREVIOUS SESSION PENDING
        // ==========================================

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
            studentFees.sessionWiseFees?.find(
              (item) =>
                item.sessionId?.toString() ===
                previousSession._id.toString()
            );

          previousYearFee =
            Number(
              previousSnapshot?.remainingAmount || 0
            );
        }

        // ==========================================
        // 7. DISCOUNT
        // ==========================================

        const discount =
          Number(studentFees.discount || 0);

        // ==========================================
        // 8. TOTAL FEE
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
        // 9. EXISTING SESSION SNAPSHOT
        // ==========================================

        const existingSnapshot =
          studentFees.sessionWiseFees?.find(
            (item) =>
              item.sessionId?.toString() ===
              session._id.toString()
          );

        // ==========================================
        // 10. PAYMENTS FOR THIS SESSION
        // ==========================================

        const payments =
          await StudentFeePayment.find({
            studentId: student._id,
            sessionId: session._id,
          });

        const paidAmount =
          payments.reduce(
            (sum, payment) =>
              sum +
              Number(
                payment.paidAmount || 0
              ),
            0
          );

        const remainingAmount =
          Math.max(
            totalFee - paidAmount,
            0
          );

        // ==========================================
        // 11. SNAPSHOT
        // ==========================================

        const snapshot = {
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

          discount,

          totalFee,
          paidAmount,
          remainingAmount,
        };

        // ==========================================
        // 12. UPDATE OR CREATE
        // ==========================================

        if (existingSnapshot) {
          Object.assign(
            existingSnapshot,
            snapshot
          );

          updatedCount++;

          console.log(
            `🔄 Updated fee snapshot: ${student._id}`
          );
        } else {
          studentFees.sessionWiseFees.push(
            snapshot
          );

          createdCount++;

          console.log(
            `🆕 Created fee snapshot: ${student._id}`
          );
        }

        await studentFees.save();

        console.log(
          `💰 ${student._id} | ${session.name}`,
          {
            yearlyFee,
            previousYearFee,
            totalFee,
            paidAmount,
            remainingAmount,
          }
        );

      } catch (studentError) {
        console.error(
          `❌ Fee snapshot error for student ${student._id}:`,
          studentError
        );

        skippedCount++;
      }
    }

    return {
      createdCount,
      updatedCount,
      skippedCount,
    };

  } catch (error) {
    console.error(
      "❌ createCurrentSessionFeeSnapshots ERROR:",
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