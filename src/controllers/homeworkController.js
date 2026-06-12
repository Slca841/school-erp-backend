import mongoose from "mongoose";
import Homework from "../models/Homework.js";
import Class from "../models/classAssign.js";
import HomeworkRead from "../models/HomeworkRead.js";
import Student from "../models/StudentModel.js";
// ✅ Create Homework (Teacher → Any class)
export const createHomework = async (req, res) => {
  try {
    const {
      subjectId,
      description,
      classId,
      teacherId,
      homeworkDate,
    } = req.body;

    const image =
      req.file?.path ||
      req.file?.secure_url ||
      "";

    if (
      !subjectId ||
      !description ||
      !classId ||
      !teacherId ||
      !homeworkDate
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const classData = await Class.findById(classId);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const homework = await Homework.create({
      subjectId,
      description,
      image,
      classId,
      teacherId,
      homeworkDate,
    });

    // 🔥 CREATE UNREAD RECORD FOR ALL STUDENTS OF CLASS
    const students = await Student.find({
      studentclass: classData.name,
    });

    const unreadRecords = students.map((s) => ({
      homeworkId: homework._id,
      studentId: s._id,
      read: false,
    }));

    await HomeworkRead.insertMany(unreadRecords, {
      ordered: false,
    });

    // 🔔 SOCKET
    req.io.to(`class_${classData.name}`).emit(
      "new_homework",
      {
        classId,
      }
    );

    res.json({
      success: true,
      message: "Homework created successfully",
      homework,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// ✅ Get homework by class (Students see this)
export const getHomeworkByClass = async (req, res) => {
  try {
    const { classId } = req.params;

 const homeworks = await Homework.find({ classId })
  .populate("teacherId", "fullName")
  .populate("classId", "name")
  .populate("subjectId", "name")
  .sort({ homeworkDate: -1 });

    res.json({ success: true, homeworks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getUnreadHomeworkCount = async (req, res) => {
  try {
    const { studentId } = req.params;

    const count = await HomeworkRead.countDocuments({
      studentId: new mongoose.Types.ObjectId(studentId),
      read: false,
    });

    res.json({ success: true, unreadCount: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markHomeworkRead = async (req, res) => {
  try {
    const { studentId } = req.body;

    await HomeworkRead.updateMany(
      {
        studentId: new mongoose.Types.ObjectId(studentId),
        read: false,
      },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ✅ Get homework by teacher (Teacher see their sent work)
export const getHomeworkByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;

const homeworks = await Homework.find({ teacherId })
  .populate("classId", "name")
  .populate("subjectId", "name")
  .sort({ homeworkDate: -1 });

    res.json({ success: true, homeworks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Delete Homework (Teacher can delete)
export const deleteHomework = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Homework.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Homework not found",
      });
    }

    await HomeworkRead.deleteMany({
      homeworkId: id,
    });

    res.json({
      success: true,
      message: "Homework deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const deleteAllHomework = async (req, res) => {
  try {
    const { teacherId } = req.params;
    await Homework.deleteMany({ teacherId });

    res.json({ success: true, message: "All homework deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
export const saveHomeworkStatus = async (req, res) => {
  try {
    const { homeworkId, students } = req.body;

    const homework = await Homework.findById(homeworkId);

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: "Homework not found",
      });
    }

    homework.students = students;

    await homework.save();

    res.json({
      success: true,
      message: "Homework status saved",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const getStudentHomeworkReport = async (
  req,
  res
) => {
  try {
    const { studentId } = req.params;

    const homeworks = await Homework.find({
      "students.studentId": studentId,
    }).populate("subjectId", "name");

    let total = 0;
    let completed = 0;

    const subjectWise = {};

    homeworks.forEach((hw) => {
      const student = hw.students.find(
        (s) =>
          s.studentId.toString() === studentId
      );

      if (!student) return;

      total++;

      if (student.status === "complete") {
        completed++;
      }

      const subject =
        hw.subjectId?.name || "Unknown";

      if (!subjectWise[subject]) {
        subjectWise[subject] = {
          total: 0,
          completed: 0,
        };
      }

      subjectWise[subject].total++;

      if (student.status === "complete") {
        subjectWise[subject].completed++;
      }
    });

    res.json({
      success: true,
      overall: {
        total,
        completed,
        pending: total - completed,
      },
      subjectWise,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const getHomeworkByDate = async (
  req,
  res
) => {
  try {
    const { classId, subjectId, date } = req.query;

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const homework = await Homework.findOne({
      classId,
      subjectId,
      homeworkDate: {
        $gte: start,
        $lte: end,
      },
    })
      .populate("subjectId", "name")
      .populate("classId", "name");

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: "No homework found",
      });
    }

    res.json({
      success: true,
      homework,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const getStudentsForHomework = async (
  req,
  res
) => {
  try {
    const { classId } = req.params;

    const classData =
      await Class.findById(classId);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const students =
      await Student.find({
        studentclass: classData.name,
      }).select("fullName");

    res.json({
      success: true,
      students,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
export const getHomeworkSummary = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const homework = await Homework.findOne({
      teacherId,
    }).sort({ homeworkDate: -1 });

    if (!homework) {
      return res.json({
        totalStudents: 0,
        completed: 0,
        notCompleted: 0,
      });
    }

    const totalStudents = homework.students.length;

    const completed =
      homework.students.filter(
        (s) => s.status === "complete"
      ).length;

    const notCompleted =
      totalStudents - completed;

    res.json({
      totalStudents,
      completed,
      notCompleted,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};