import Class from "../models/classAssign.js";
import Student from "../models/StudentModel.js";

// ✅ Get students by teacher
export const getTeacherStudents = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Find class assigned to teacher
    const classData = await Class.findOne({ teacherId });
    if (!classData) {
      return res.status(404).json({ success: false, message: "No class assigned to this teacher" });
    }

    // Students of that class (by className)
    const students = await Student.find({ studentclass: classData.name });

    res.json({
      success: true,
      className: classData.name,
      classId: classData._id,
      students,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Create class
export const createClass = async (req, res) => {
  try {
    const { name } = req.body;
    const newClass = await Class.create({ name });
    res.json({ success: true, class: newClass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get all classes (with teacher info)
export const getClasses = async (req, res) => {
  try {
    const classes = await Class.find().populate("teacherId", "fullName contact email");
    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Assign teacher to class
export const assignTeacher = async (req, res) => {
  try {
    const { classId, teacherId } = req.body;
    const updated = await Class.findByIdAndUpdate(
      classId,
      { teacherId },
      { new: true }
    ).populate("teacherId", "fullName contact email");

    res.json({ success: true, class: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get students of a class
export const getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const classData = await Class.findById(classId);

    if (!classData) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const students = await Student.find({ studentclass: classData.name });
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get teacher of a class (by classId)
export const getClassTeacher = async (req, res) => {
  try {
    const { classId } = req.params;

    const classData = await Class.findById(classId).populate(
      "teacherId",
      "fullName email contact"
    );

    if (!classData) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    if (!classData.teacherId) {
      return res.status(404).json({ success: false, message: "No teacher assigned to this class" });
    }

    res.json({
      success: true,
      className: classData.name,
      teacher: classData.teacherId,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get teacher of a class (by className) – for students/attendance
export const getClassName = async (req, res) => {
  try {
    const { className } = req.params;

    const classData = await Class.findOne({ name: className }).populate(
      "teacherId",
      "fullName email"
    );

    if (!classData || !classData.teacherId) {
      return res
        .status(404)
        .json({ success: false, message: "No teacher assigned to this class" });
    }

    res.json({ success: true, teacher: classData.teacherId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getClass = async (req, res) => {
  try {
    const classes = await Class.find();
    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};




