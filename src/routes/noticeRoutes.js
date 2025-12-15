import express from "express";
import Notice from "../models/Notice.js";
import { noticeUpload } from "../middleware/multerMiddleware.js";
import fs from "fs";
import path from "path";

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
        return res
          .status(400)
          .json({ success: false, message: "Required fields missing" });
      }

      const noticeData = {
        title,
        message,
        targetType,
        targetClass,
        createdBy,
      };

      // ✅ image sirf tab add hogi jab bheji ho
      if (req.file) {
        noticeData.image = `/uploads/notices/${req.file.filename}`;
      }

      const notice = await Notice.create(noticeData);

      // 🔔 SOCKET EMIT
      const io = req.app.get("io");
      if (io) {
        setTimeout(() => {
          if (targetType === "all") {
            io.emit("new_notice_all", { notice });
          } else if (targetType === "class" && targetClass) {
            io.to(`class_${targetClass}`).emit("new_notice_student", { notice });
          } else if (targetType === "teachers") {
            io.to("teachers").emit("new_notice_teacher", { notice });
          }
        }, 300);
      }

      res.status(201).json({ success: true, notice });
    } catch (err) {
      console.error("❌ Notice create error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

/**
 * 🧩 STUDENT NOTICES
 */
noticeRoutes.get("/student/:className", async (req, res) => {
  try {
    const { className } = req.params;

    const notices = await Notice.find({
      $or: [
        { targetType: "all" },
        { targetType: "class", targetClass: new RegExp(`^${className}$`, "i") },
      ],
    }).sort({ createdAt: -1 });

    res.json({ success: true, notices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 🧩 TEACHER NOTICES
 */
noticeRoutes.get("/teacher", async (req, res) => {
  const notices = await Notice.find({ targetType: "teachers" }).sort({
    createdAt: -1,
  });
  res.json({ success: true, notices });
});

/**
 * 🧩 ADMIN ALL
 */
noticeRoutes.get("/all", async (req, res) => {
  const notices = await Notice.find().populate("createdBy", "fullName role");
  res.json({ success: true, notices });
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

    // ✅ IMAGE DELETE (agar exist karti hai)
    if (notice.image) {
      const imagePath = path.join(process.cwd(), notice.image);

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // ✅ DB DELETE
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
  try {
 const { teacherId } = req.params;

  const notices = await Notice.find({ createdBy: teacherId }).sort({
    createdAt: -1,
  });

  res.json({ success: true, notices });
  } catch (err) {
    console.error("❌ Error fetching teacher notices:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

noticeRoutes.get("/only-teachers", async (req, res) => {
  try {
    const notices = await Notice.find({ targetType: "teachers" })
      .sort({ createdAt: -1 });

    res.json({ success: true, notices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


export default noticeRoutes;