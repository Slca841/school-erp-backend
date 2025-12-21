import Attendance from "../models/Attendance.js";
import Class from "../models/classAssign.js";
import Student from "../models/StudentModel.js";

/* =========================================================
   1️⃣ MARK CLASS-WISE ATTENDANCE (ONLY ACTIVE STUDENTS)
========================================================= */
// classAssignController.js (example)


export const getTeacherAssignedStudents = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const classData = await Class.findOne({ teacherId }).populate({
      path: "students",
      match: { status: "ACTIVE" }, // ✅ Only ACTIVE students
      select: "_id fullName rollNo status",
    });

    if (!classData) {
      return res.status(404).json({ success: false, message: "No class found" });
    }

    res.json({ students: classData.students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAttendance = async (req, res) => {
  try {
    const { teacherId, students } = req.body;
    // students = [{ studentId, status }]

    // 🔍 Teacher ki class
    const classData = await Class.findOne({ teacherId });
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "No class assigned",
      });
    }

    // 📅 Today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🔒 ONLY ACTIVE STUDENTS ALLOWED
    const activeStudents = await Student.find({
      _id: { $in: students.map(s => s.studentId) },
      status: "ACTIVE",
    }).select("_id");

    const allowedIds = activeStudents.map(s => s._id.toString());

 const filteredStudents = students.filter(s =>
  allowedIds.includes(s.studentId.toString())
);


    if (filteredStudents.length === 0) {
      return res.json({
        success: false,
        message: "No active students to mark attendance",
      });
    }

    // 💾 Save attendance
    const record = await Attendance.findOneAndUpdate(
      { classId: classData._id, date: today },
      {
        classId: classData._id,
        className: classData.name,
        date: today,
        students: filteredStudents,
        markedBy: teacherId,
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: "Attendance saved", record });
  } catch (err) {
    console.error("Attendance error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   2️⃣ GET TODAY ATTENDANCE (CLASS ID)
========================================================= */
export const getTodayAttendance = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const classData = await Class.findOne({ teacherId });
    if (!classData) {
      return res.json({ success: true, record: null });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // ✅ SAME DAY UNTIL 12 AM

    const record = await Attendance.findOne({
      classId: classData._id,
      date: today,
    }).populate({
      path: "students.studentId",
      select: "fullName rollNo status",
      match: { status: "ACTIVE" },
    });

    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/* =========================================================
   3️⃣ GET CLASS ATTENDANCE (TEACHER)
========================================================= */
// export const getClassAttendance = async (req, res) => {
//   try {
//     const { teacherId } = req.params;

//     const classData = await Class.findOne({ teacherId });
//     if (!classData) {
//       return res.status(404).json({
//         success: false,
//         message: "No class assigned",
//       });
//     }

//     const today = new Date();
//     today.setHours(0, 0, 0, 0);

//     const record = await Attendance.findOne({
//       classId: classData._id,
//       date: today,
//     }).populate({
//   path: "students.studentId",
//   select: "fullName rollNo status",
//   match: { status: "ACTIVE" }  // ✅ Only active students
// });

//     res.json({
//       success: true,
//       class: classData.name,
//       record,
//     });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

/* =========================================================
   4️⃣ TEACHER DASHBOARD SUMMARY (ACTIVE STUDENTS ONLY)
========================================================= */
export const getTeacherAttendanceSummary = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const classData = await Class.findOne({ teacherId });
    if (!classData) {
      return res.json({
        success: true,
        class: null,
        totalStudents: 0,
        present: 0,
        absent: 0,
        leave: 0,
      });
    }

    const className = classData.name;

    // ✅ ONLY ACTIVE STUDENTS
    const totalStudents = await Student.countDocuments({
      studentclass: className,
      status: "ACTIVE",
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await Attendance.findOne({
      classId: classData._id,
      date: today,
    });

    if (!record) {
      return res.json({
        success: true,
        class: className,
        totalStudents,
        present: 0,
        absent: 0,
        leave: 0,
      });
    }

    const present = record.students.filter(s => s.status === "Present").length;
    const absent = record.students.filter(s => s.status === "Absent").length;
    const leave = record.students.filter(s => s.status === "Leave").length;

    res.json({
      success: true,
      class: className,
      totalStudents,
      present,
      absent,
      leave,
      record,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   5️⃣ ADMIN — SCHOOL SUMMARY TODAY
========================================================= */
export const getAdminAttendanceSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const records = await Attendance.find({ date: today });

    let present = 0;
    let absent = 0;
    let leave = 0;
    let total = 0;

    records.forEach(rec => {
      total += rec.students.length;
      present += rec.students.filter(s => s.status === "Present").length;
      absent += rec.students.filter(s => s.status === "Absent").length;
      leave += rec.students.filter(s => s.status === "Leave").length;
    });

    res.json({
      success: true,
      totalStudents: total,
      present,
      absent,
      leave,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   6️⃣ ADMIN — CLASS WISE SUMMARY
========================================================= */
export const getClassWiseSummary = async (req, res) => {
  try {
    const { classId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await Attendance.findOne({
      classId,
      date: today,
    });

    if (!record) {
      return res.json({
        success: true,
        message: "No attendance today",
        present: 0,
        absent: 0,
        leave: 0,
        total: 0,
      });
    }

    const present = record.students.filter(s => s.status === "Present").length;
    const absent = record.students.filter(s => s.status === "Absent").length;
    const leave = record.students.filter(s => s.status === "Leave").length;

    res.json({
      success: true,
      class: record.className,
      totalStudents: record.students.length,
      present,
      absent,
      leave,
    });
  } catch (err) {
    console.error("Class summary error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   7️⃣ STUDENT ATTENDANCE (MONTHLY — HISTORY ALLOWED)
========================================================= */
export const getStudentAttendance = async (req, res) => {
  try {
    const { studentId, month, year } = req.params;

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    end.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      date: { $gte: start, $lte: end },
      "students.studentId": studentId,
    });

    let present = 0;
    let absent = 0;

    records.forEach(rec => {
      const student = rec.students.find(
        s => s.studentId.toString() === studentId
      );
      if (student?.status === "Present") present++;
      else absent++;
    });

    res.json({
      success: true,
      present,
      absent,
      total: present + absent,
      records,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/* =========================================================
   8️⃣ STUDENT OVERALL ATTENDANCE
========================================================= */
export const getStudentOverallAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;

    const records = await Attendance.find({
      "students.studentId": studentId,
    });

    let present = 0;
    let absent = 0;
    let leave = 0;

    records.forEach(rec => {
      const studentRec = rec.students.find(
        s => s.studentId.toString() === studentId
      );

      if (studentRec) {
        if (studentRec.status === "Present") present++;
        if (studentRec.status === "Absent") absent++;
        if (studentRec.status === "Leave") leave++;
      }
    });

    res.json({
      success: true,
      studentId,
      totalDays: present + absent + leave,
      present,
      absent,
      leave,
      records,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
