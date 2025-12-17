import express from "express";
import Notice from "../models/Notice.js";
import Notification from "../models/Notification.js";
import { noticeUpload } from "../middleware/noticeUploadCloudinary.js";
import cloudinary from "../utils/cloudinary.js";

const noticeRoutes = express.Router();

/* ================================
   🔧 Helper: Attach Sender Name
   ================================ */
const attachSenderName = (notices) => {
  return notices.map((n) => {
    let senderName = "System";

    if (n.createdBy?.role === "admin") senderName = "Admin";
    if (n.createdBy?.role === "teacher") senderName = "Class Teacher";

    return {
      ...n.toObject(),
      senderName,
    };
  });
};

/* ================================
   🧩 CREATE NOTICE
   ================================ */
noticeRoutes.post(
  "/create",
  noticeUpload.single("image"),
  async (req, res) => {
    try {
      const { title, message, targetType, targetClass } = req.body;
const createdBy =
  req.body.createdBy && req.body.createdBy !== "null"
    ? req.body.createdBy
    : null;

      if (!title || !message || !targetType) {
        return res.status(400).json({
          success: false,
          message: "Required fields missing",
        });
      }

      const noticeData = {
        title,
        message,
        targetType,
        targetClass,
        createdBy,
      };

      // 🖼️ Image
      if (req.file) {
        noticeData.image = req.file.path;
        noticeData.imagePublicId = req.file.filename;
      }

      // ✅ Create Notice
      const notice = await Notice.create(noticeData);

      // ✅ Create Notification (STUDENT SIDE)
      if (targetType === "all") {
        await Notification.create({
          type: "notice",
          message: title,
          recipientType: "all",
          data: { noticeId: notice._id },
        });
      }

      if (targetType === "class" && targetClass) {
        await Notification.create({
          type: "notice",
          message: title,
          recipientType: "class",
          className: targetClass,
          data: { noticeId: notice._id },
        });
      }

      // ✅ Populate sender role
      const populated = await Notice.findById(notice._id).populate(
        "createdBy",
        "role"
      );
      const [finalNotice] = attachSenderName([populated]);

      // 🔔 SOCKET EMIT
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

      return res.status(201).json({
        success: true,
        notice: finalNotice,
      });
    } catch (err) {
      console.error("❌ Notice create error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ================================
   🧩 STUDENT NOTICES
   ================================ */
noticeRoutes.get("/student/:className", async (req, res) => {
  try {
    const { className } = req.params;

    const notices = await Notice.find({
      $or: [
        { targetType: "all" },
        { targetType: "class", targetClass: new RegExp(`^${className}$`, "i") },
      ],
    }).populate("createdBy", "role");

    const finalNotices = attachSenderName(notices);
    res.json({ success: true, notices: finalNotices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================================
   🧩 TEACHER NOTICES
   ================================ */
noticeRoutes.get("/teacher", async (req, res) => {
  const notices = await Notice.find({ targetType: "teachers" }).populate(
    "createdBy",
    "role"
  );

  const finalNotices = attachSenderName(notices);
  res.json({ success: true, notices: finalNotices });
});

/* ================================
   🧩 ADMIN – ALL NOTICES
   ================================ */
noticeRoutes.get("/all", async (req, res) => {
  const notices = await Notice.find().populate("createdBy", "role");
  const finalNotices = attachSenderName(notices);
  res.json({ success: true, notices: finalNotices });
});

/* ================================
   🧩 UPDATE NOTICE
   ================================ */
noticeRoutes.put("/update/:id", async (req, res) => {
  const updated = await Notice.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json({ success: true, notice: updated });
});

/* ================================
   🧩 DELETE NOTICE
   ================================ */
noticeRoutes.delete("/delete/:id", async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) {
      return res
        .status(404)
        .json({ success: false, message: "Notice not found" });
    }

    if (notice.imagePublicId) {
      await cloudinary.uploader.destroy(notice.imagePublicId);
    }

    await Notice.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Notice & image deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default noticeRoutes;
