import Student from "../models/StudentModel.js";
import Attendance from "../models/Attendance.js";
import Homework from "../models/Homework.js";

export const getStudentRiskReport = async (
  req,
  res
) => {
  try {
    const { classId } = req.params;
    const days = Number(req.query.days) || 3;

    const students = await Student.find({
      studentclass: classId,
    });

    const report = [];

    for (const student of students) {
      // =====================
      // Attendance
      // =====================
const attendanceRecords =
  await Attendance.find({
    className: classId,
    "students.studentId": student._id,
  })
    .sort({ date: -1 })
    .limit(days);

let absentDays = 0;

attendanceRecords.forEach((att) => {
  const record = att.students.find(
    (s) =>
      s.studentId.toString() ===
      student._id.toString()
  );

  if (
    record &&
    record.status === "Absent"
  ) {
    absentDays++;
  }
});
      // =====================
      // Homework
      // =====================
      const homeworkRecords =
        await Homework.find({
          "students.studentId":
            student._id,
        })
          .sort({
            homeworkDate: -1,
          })
          .limit(days);

      let homeworkMissed = 0;

      homeworkRecords.forEach((hw) => {
        const record =
          hw.students.find(
            (s) =>
              s.studentId.toString() ===
              student._id.toString()
          );

        if (
          record &&
          record.status ===
            "not_complete"
        ) {
          homeworkMissed++;
        }
      });

      if (
        absentDays > 0 ||
        homeworkMissed > 0
      ) {
        report.push({
          studentId: student._id,
          name: student.fullName,
          contact:
            student.contact1,
          absentDays,
          homeworkMissed,
        });
      }
    }

    res.json({
      success: true,
      report,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};