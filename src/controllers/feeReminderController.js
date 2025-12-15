import FeeReminder from "../models/FeeReminderModel.js";
import Student from "../models/StudentModel.js";
import StudentFeePayment from "../models/StudentFeePayment.js";
import { io } from "../server.js";

export const sendFeeReminder = async (req, res) => {
  try {
    const { className, targetFee } = req.body;

    if (!className || !targetFee)
      return res.status(400).json({
        success: false,
        message: "Class and targetFee required",
      });

    const students = await Student.find({ studentclass: className });

    if (!students.length)
      return res.json({
        success: false,
        message: "No students found in this class",
      });

    const reminders = [];

    for (const student of students) {
      const payments = await StudentFeePayment.aggregate([
        { $match: { studentId: student._id } },
        {
          $group: {
            _id: "$studentId",
            totalPaid: { $sum: "$paidAmount" },
          },
        },
      ]);

      const totalPaid = payments.length ? payments[0].totalPaid : 0;

      if (totalPaid < targetFee) {
        const message = `Dear ${student.fullName}, please submit your pending fees.`

        // ⭐ Save or Update reminder (ALWAYS only 1)
        const newReminder = await FeeReminder.findOneAndUpdate(
          { studentId: student._id },
          {
            message,
            totalPaid,
            targetFee,
          },
          { new: true, upsert: true }
        );

        // ⭐ Delete duplicates (safe)
        await FeeReminder.deleteMany({
          studentId: student._id,
          _id: { $ne: newReminder._id },
        });

        // 🔔 Send socket with new fields
        io.to(`student_${student._id}`).emit("fee_reminder", {
          message,
          totalPaid,
          targetFee,
          createdAt: newReminder.createdAt,
          _id: newReminder._id,
        });

        reminders.push({
          studentId: student._id,
          name: student.fullName,
          totalPaid,
          targetFee,
        });
      }
    }

    res.json({
      success: true,
      message: `Reminders sent to ${reminders.length} students.`,
      reminders,
    });

  } catch (err) {
    console.error("❌ Fee reminder error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


 
  export const getFeeReminder = async (req, res) => {
    try {
    const reminder = await FeeReminder.findOne({
      studentId: req.params.studentId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      reminder, // only 1
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
