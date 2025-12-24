import bcrypt from "bcrypt";

// controllers/teacherController.js
import Teacher from "../models/TeacherModel.js";
import TeacherComplaint from "../models/TeacherComplaint.js";
import User from "../models/userModel.js";
import Homework from "../models/Homework.js";
import Notice from "../models/Notice.js";
import TeacherSubjectAssign from "../models/TeacherSubjectAssignModel.js";
// ✅ Get all teachers with complaint count + password
export const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find()
      .populate("userId", "name email originalPassword");

    const teachersWithComplaints = await Promise.all(
      teachers.map(async (t) => {
        const count = await TeacherComplaint.countDocuments({ teacherId: t._id });
        return { ...t.toObject(), complaintCount: count };
      })
    );

    res.json({ success: true, teachers: teachersWithComplaints });
  } catch (err) {
    console.error("❌ getTeachers error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get single teacher
export const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await Teacher.findById(id)
      .populate("userId", "name email originalPassword");

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }
    res.json({ success: true, teacher });
  } catch (err) {
    console.error("❌ getTeacherById error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update teacher

export const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, ...teacherData } = req.body;

    const teacher = await Teacher.findByIdAndUpdate(
      id,
      teacherData,
      { new: true }
    );

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    if (teacher.userId) {
      const updateUser = {};

      if (name) updateUser.name = name;
      if (email) updateUser.email = email;

      if (password && password.trim() !== "") {
        const hashed = await bcrypt.hash(password, 10);
        updateUser.password = hashed;
        updateUser.originalPassword = password;
      }

      await User.findByIdAndUpdate(teacher.userId, updateUser);
    }

    res.json({ success: true, teacher });
  } catch (err) {
    console.error("❌ updateTeacher error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    // 1️⃣ Delete User account (login)
    if (teacher.userId) {
      await User.findByIdAndDelete(teacher.userId);
    }

    // 2️⃣ Delete all complaints made about this teacher
    await TeacherComplaint.deleteMany({ teacherId: id });

    // 3️⃣ Delete Homework created by teacher
    await Homework.deleteMany({ teacherId: id });

    // 4️⃣ Delete Notices created by teacher
    await Notice.deleteMany({ teacherId: id });

    // 6️⃣ Finally delete teacher profile
    await Teacher.findByIdAndDelete(id);

    await TeacherSubjectAssign.deleteMany({ teacherId: id });

    res.json({
      success: true,
      message: "Teacher and all related data deleted successfully",
    });

  } catch (err) {
    console.error("❌ deleteTeacher error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get all ACCOUNT users (for Account View modal)
export const getAccountUsers = async (req, res) => {
  try {
    const accounts = await User.find({ role: "account" }).select(
      "name email originalPassword isActive"
    );

    res.json({
      success: true,
      accounts,
    });
  } catch (err) {
    console.error("❌ getAccountUsers error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch account users",
    });
  }
};

