import express from "express";
import Notice from "../models/Notice.js";
import {noticeUpload} from "../middleware/noticeUploadCloudinary.js";
import cloudinary from "../utils/cloudinary.js";


const attachSenderName = (notices) => {
  return notices.map((n) => {
    let senderName = "System";

    if (n.createdBy?.role === "admin") {
      senderName = "Admin";
    }

    if (n.createdBy?.role === "teacher") {
      senderName = "Class Teacher";
    }

    return {
      ...n.toObject(),
      senderName,
    };
  });
};


const noticeRoutes = express.Router();

/**
 * 🧩 CREATE NOTICE (IMAGE OPTIONAL)
 */
noticeRoutes.post(
  "/create",
  noticeUpload.single("image"),
  async (req, res) => {
    try {
      const { title, message, targetType, targetClass, createdBy } = req.body;

      if (!title || !message || !targetType) {
        return res.status(400).json({ success: false, message: "Required fields missing" });
      }

      const noticeData = {
        title,
        message,
        targetType,
        targetClass,
        createdBy,
      };

  if (req.file) {
  noticeData.image = req.file.path;              
 noticeData.imagePublicId = req.file.filename; 
}

const notice = await Notice.create(noticeData);

// ✅ ADD THIS
const populated = await Notice.findById(notice._id)
  .populate("createdBy", "role");

const [finalNotice] = await attachSenderName([populated]);

const io = req.app.get("io");
if (io) {
  setTimeout(() => {
    if (targetType === "all") {
      io.emit("new_notice_all", { notice: finalNotice });
    } else if (targetType === "class" && targetClass) {
      io.to(`class_${targetClass}`).emit("new_notice_student", {
        notice: finalNotice,
      });
    } else if (targetType === "teachers") {
      io.to("teachers").emit("new_notice_teacher", {
        notice: finalNotice,
      });
    }
  }, 300);
}

// 🔥 RESPONSE bhi populated bhejo
res.status(201).json({ success: true, notice: finalNotice });

    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);


/**
 * 🧩 STUDENT NOTICES
 */
noticeRoutes.get("/student/:className", async (req, res) => {
  try {
     const notices = await Notice.find({
    $or: [
      { targetType: "all" },
      { targetType: "class", targetClass: new RegExp(`^${className}$`, "i") },
    ],
  })
    .populate("createdBy", "role");

  const finalNotices = await attachSenderName(notices);

  res.json({ success: true, notices: finalNotices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


/**
 * 🧩 TEACHER NOTICES
 */

noticeRoutes.get("/teacher", async (req, res) => {
  const notices = await Notice.find({ targetType: "teachers" })
    .populate("createdBy", "role");

  const finalNotices = await attachSenderName(notices);

  res.json({ success: true, notices: finalNotices });
});



/**
 * 🧩 ADMIN ALL
 */
noticeRoutes.get("/all", async (req, res) => {
  const notices = await Notice.find()
    .populate("createdBy", "role");

  const finalNotices = await attachSenderName(notices);

  res.json({ success: true, notices: finalNotices });
});


/**
 * 🧩 UPDATE NOTICE (TEXT ONLY)
 */
noticeRoutes.put("/update/:id", async (req, res) => {
  const updated = await Notice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.json({ success: true, notice: updated });
});

/**
 * 🧩 DELETE NOTICE
 */
noticeRoutes.delete("/delete/:id", async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: "Notice not found",
      });
    }

    // ✅ DELETE IMAGE FROM CLOUDINARY
    if (notice.imagePublicId) {
      await cloudinary.uploader.destroy(notice.imagePublicId);
    }

    // ✅ DELETE FROM DB
    await Notice.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Notice & image deleted successfully",
    });
  } catch (err) {
    console.error("❌ Notice delete error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});



/**
 * 🧩 7. Get Notices created by a specific Teacher
 */
noticeRoutes.get("/teacher/:teacherId", async (req, res) => {
  const notices = await Notice.find({ createdBy: req.params.teacherId })
    .populate("createdBy", "role");

  const finalNotices = await attachSenderName(notices);

  res.json({ success: true, notices: finalNotices });
});



noticeRoutes.get("/only-teachers", async (req, res) => {
  const notices = await Notice.find({ targetType: "teachers" })
    .populate("createdBy", "role");

  const finalNotices = await attachSenderName(notices);

  res.json({ success: true, notices: finalNotices });
});



export default noticeRoutes;