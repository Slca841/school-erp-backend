import TeacherSubjectAssign from "../models/TeacherSubjectAssignModel.js";
import Subject from "../models/SubjectModel.js";

// ✅ Assign multiple subjects (each with different teacher)
export const assignSubjectsToTeacher = async (req, res) => {
  try {
    const { className, subjects } = req.body;

    if (!className || !subjects?.length) {
      return res.status(400).json({
        success: false,
        message: "Missing class or subjects!",
      });
    }

    for (const item of subjects) {
      if (!item.name || !item.teacherId) continue;

      // Create subject if not exists
      let subject = await Subject.findOne({ name: item.name });
      if (!subject) {
        subject = new Subject({ name: item.name });
        await subject.save();
      }

      // Find document by class + teacher
      let record = await TeacherSubjectAssign.findOne({
        className,
        teacherId: item.teacherId,
      });

      if (!record) {
        // Create new record for this teacher
        record = new TeacherSubjectAssign({
          className,
          section: "A",
          teacherId: item.teacherId,
          subjects: [subject._id],
        });
      } else {
        // Add subject only if not already in array
        if (!record.subjects.includes(subject._id)) {
          record.subjects.push(subject._id);
        }
      }

      await record.save();
    }

    res.json({
      success: true,
      message: "✅ Subjects assigned successfully!",
    });

  } catch (err) {
    console.error("❌ Error assigning subjects:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};


// ✅ Fetch all teachers and subjects for a class

export const getTeachersByClass = async (req, res) => {
  try {
    const { className } = req.params;

    const data = await TeacherSubjectAssign.find({ className })
      .populate("teacherId", "fullName")
      .populate("subjects", "name");

    if (!data.length) {
      return res.json({ success: true, teachers: [] });
    }

    const formatted = data.map((item) => ({
      teacherId: item.teacherId?._id,
      teacherName: item.teacherId?.fullName || "Unnamed",
      subjects: item.subjects.map((s) => ({
        _id: s._id,
        name: s.name,
      })),
    }));

    res.json({
      success: true,
      className,
      teachers: formatted,
    });
  } catch (err) {
    console.error("❌ Error fetching class subjects:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// ✅ Delete subject from class + delete teacher record if no subjects left
export const deleteSubjectFromClass = async (req, res) => {
  try {
    const { className, subjectId } = req.params;

    if (!className || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters",
      });
    }

    // Find all teachers assigned to this class
    const assignments = await TeacherSubjectAssign.find({ className });

    if (!assignments.length) {
      return res.status(404).json({
        success: false,
        message: "No subject found for this class",
      });
    }

    let updated = 0;

    for (const assign of assignments) {
      const before = assign.subjects.length;

      // remove subject
      assign.subjects = assign.subjects.filter(
        (subId) => subId.toString() !== subjectId
      );

      // Case 1: subject was removed
      if (assign.subjects.length !== before) {
        updated++;

        // Case 2: no subjects left → delete whole record
        if (assign.subjects.length === 0) {
          await TeacherSubjectAssign.findByIdAndDelete(assign._id);
        } else {
          await assign.save(); // save updated subjects
        }
      }
    }

    if (updated === 0) {
      return res.status(404).json({
        success: false,
        message: "Subject not found in this class",
      });
    }

    res.json({
      success: true,
      message: `✅ Subject removed. Empty teacher records deleted automatically.`,
    });
  } catch (err) {
    console.error("❌ Error deleting subject:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
