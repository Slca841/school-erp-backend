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

    if (n.createdByRole === "admin") senderName = "Admin";
    else if (n.createdByRole === "teacher") senderName = "Class Teacher";

    return {
      ...n.toObject(),
      senderName,
    };
  });
};
const safeNoticeUpload = (req, res, next) => {
  noticeUpload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

/* ================================
   🧩 CREATE NOTICE
   ================================ */
noticeRoutes.post(
  "/create", safeNoticeUpload, async (req, res) => {
    try {
      const {
        title,
        message,
        targetType,
        targetClass,
        createdByRole,
           createdById,
      } = req.body;

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
        createdByRole: createdByRole || "system",
           createdById,
      };

 if (req.file?.path) {
  noticeData.image = req.file.path;
  noticeData.imagePublicId = req.file.filename;
}


      const notice = await Notice.create(noticeData);

      // 🔔 Student notifications
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

      const [finalNotice] = attachSenderName([notice]);

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

      res.status(201).json({
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
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      notices: attachSenderName(notices),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// GET teacher's own notices
noticeRoutes.get("/teacher/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    // sirf wo notices jo teacher ne create kiye
    const notices = await Notice.find({
      createdByRole: "teacher",
      createdById: teacherId,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      notices: attachSenderName(notices),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
/* ================================
   🧩 TEACHER NOTICES
   ================================ */
noticeRoutes.get("/teacher", async (req, res) => {
  const notices = await Notice.find({
    targetType: "teachers",
  }).sort({ createdAt: -1 });

  res.json({
    success: true,
    notices: attachSenderName(notices),
  });
});

/* ================================
   🧩 ADMIN – ALL NOTICES
   ================================ */
noticeRoutes.get("/all", async (req, res) => {
  const notices = await Notice.find().sort({ createdAt: -1 });

  res.json({
    success: true,
    notices: attachSenderName(notices),
  });
});

/* ================================
   🧩 UPDATE NOTICE
   ================================ */
noticeRoutes.put(
  "/update/:id",
  noticeUpload.single("image"),
  async (req, res) => {
    try {
      const notice = await Notice.findById(req.params.id);
      if (!notice) {
        return res.status(404).json({ success: false, message: "Not found" });
      }

      // text update
      notice.title = req.body.title || notice.title;
      notice.message = req.body.message || notice.message;

      // image update
      if (req.file) {
        // old image delete
        if (notice.imagePublicId) {
          await cloudinary.uploader.destroy(notice.imagePublicId);
        }

        notice.image = req.file.path;
        notice.imagePublicId = req.file.filename;
      }

      await notice.save();

      res.json({ success: true, notice });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);


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
