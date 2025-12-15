import Attendance from "../models/Attendance.js";
import Homework from "../models/Homework.js";
import Notice from "../models/Notice.js";
import TeacherComplaint from "../models/TeacherComplaint.js";
import LeaveApplication from "../models/LeaveApplication.js";
import FeeReminder from "../models/FeeReminderModel.js";
import Event from "../models/EventModel.js";

// 🔥 ADD THIS
import StudentFeePayment from "../models/StudentFeePayment.js";

// --------------------------------------------
// 📌 START NEW SESSION (DELETE OLD DATA + PAYMENT)
// --------------------------------------------
export const startNewSession = async (req, res) => {
  try {
    // ❌ Academic / general data
    await Attendance.deleteMany({});
    await Homework.deleteMany({});
    await Notice.deleteMany({});
    await TeacherComplaint.deleteMany({});
    await LeaveApplication.deleteMany({});
    await FeeReminder.deleteMany({});
    await Event.deleteMany({});

    // ❌ PAYMENT HISTORY (CARRY FORWARD LOGIC IS ELSEWHERE)
    await StudentFeePayment.deleteMany({});

    res.status(200).json({
      success: true,
      message:
        "🚀 New session started. Academic data & payment history deleted successfully!",
    });
  } catch (error) {
    console.error("❌ Start session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start new session",
    });
  }
};
