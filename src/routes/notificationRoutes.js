import express from "express";
import Notice from "../models/Notice.js";
import LeaveApplication from "../models/LeaveApplication.js";
import TeacherComplaint from "../models/TeacherComplaint.js"
const notificationRouter = express.Router();

/**
 * ✅ 1. Get unread notice count for a specific teacher
 * Route: GET /api/notification/unread-notice/:teacherId
 */
notificationRouter.get("/unread-notice/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // ✅ Sirf teachers ke liye wale notice count karne hain
    const unreadCount = await Notice.countDocuments({
      targetType: "teachers",
     readBy: { $ne: String(teacherId) }

    });

    res.json({ success: true, unreadCount });
  } catch (err) {
    console.error("❌ Error fetching teacher unread notices:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ 2. Get unread leave application count for teacher
 * Route: GET /api/notification/unread-leaves/:teacherId
 */
notificationRouter.get("/unread-leaves/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Count leave applications not seen by teacher
    const unreadCount = await LeaveApplication.countDocuments({
      teacherId,
      seenByTeacher: false,
    });

    res.json({ success: true, unreadCount });
  } catch (err) {
    console.error("Error fetching unread leaves:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ 3. Mark selected notices as read
 * Route: POST /api/notification/mark-notice-read
 * Body: { teacherId, noticeIds: [] }
 */
notificationRouter.post("/mark-notice-read", async (req, res) => {
  try {
    const { teacherId, noticeIds } = req.body;
    if (!teacherId || !Array.isArray(noticeIds))
      return res
        .status(400)
        .json({ success: false, message: "teacherId and noticeIds required" });

await Notice.updateMany(
  { _id: { $in: noticeIds } },
  { $addToSet: { readBy: String(teacherId) } }
);


    res.json({ success: true, message: "Notices marked as read" });
  } catch (err) {
    console.error("Error marking notice read:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ 4. Mark all leaves as seen for teacher
 * Route: POST /api/notification/mark-leaves-read
 * Body: { teacherId }
 */
notificationRouter.post("/mark-leaves-read", async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId)
      return res
        .status(400)
        .json({ success: false, message: "teacherId required" });

    await LeaveApplication.updateMany(
      { teacherId, seenByTeacher: false },
      { $set: { seenByTeacher: true } }
    );

    res.json({ success: true, message: "Leaves marked as read" });
  } catch (err) {
    console.error("Error marking leaves read:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

notificationRouter.get("/unread-student-notice/:studentId/:className", async (req, res) => {
  try {
    const { studentId, className } = req.params;

    const unreadCount = await Notice.countDocuments({
      $or: [
        { targetType: "all" },
        { targetType: "class", targetClass: className },
      ],
      readBy: { $ne: String(studentId) }
    });

    res.json({ success: true, unreadCount });
  } catch (err) {
    console.error("❌ Error fetching student unread notices:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// ✅ Get unread (Pending) complaints count
notificationRouter.get("/unread/count", async (req, res) => {
  try {
    const count = await TeacherComplaint.countDocuments({ status: "Pending" });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
/**
 * ✅ 5. Mark student notices as read
 * Route: POST /api/notification/mark-student-notice-read
 * Body: { studentId, noticeIds: [] }
 */
notificationRouter.post("/mark-student-notice-read", async (req, res) => {
  try {
    const { studentId, noticeIds } = req.body;

    if (!studentId || !Array.isArray(noticeIds)) {
      return res.status(400).json({
        success: false,
        message: "studentId and noticeIds required",
      });
    }

    await Notice.updateMany(
      { _id: { $in: noticeIds } },
      { $addToSet: { readBy: String(studentId) } }
    );

    res.json({ success: true, message: "Student notices marked as read" });
  } catch (err) {
    console.error("❌ Student mark read error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default notificationRouter;