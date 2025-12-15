import Homework from "../models/Homework.js";
import Class from "../models/classAssign.js";

// ✅ Create Homework (Teacher → Any class)
export const createHomework = async (req, res) => {
  try {
    const { subject, description, classId, teacherId } = req.body;

    if (!subject || !description || !classId || !teacherId) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const homework = await Homework.create({
      subject,
      description,
      classId,
      teacherId,
    });

    res.json({ success: true, message: "Homework created successfully", homework });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get homework by class (Students see this)
export const getHomeworkByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    const homeworks = await Homework.find({ classId })
      .populate("teacherId", "fullName")
      .populate("classId", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, homeworks });
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
      .sort({ createdAt: -1 });

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
      return res.status(404).json({ success: false, message: "Homework not found" });
    }
    res.json({ success: true, message: "Homework deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
