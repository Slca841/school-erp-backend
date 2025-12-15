import express from "express";
import School from "../models/School.js";
import { qrUpload } from "../middleware/multerMiddleware.js";

const schoolRouter = express.Router();

/**
 * 🔳 CREATE / UPDATE SCHOOL QR (SINGLE)
 */
schoolRouter.put(
  "/qr",
  qrUpload.single("qr"),
  async (req, res) => {
    try {
      const qrPath = req.file
        ? `/uploads/qr/${req.file.filename}`
        : null;

      const school = await School.findOne();

      if (!school) {
        await School.create({ qrImage: qrPath });
      } else {
        school.qrImage = qrPath;
        await school.save();
      }

      res.json({ success: true, message: "QR updated", qr: qrPath });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);
// 🔍 Get Current School QR
schoolRouter.get("/qr", async (req, res) => {
  try {
    const school = await School.findOne();
    res.json({
      success: true,
      qrImage: school ? school.qrImage : null,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default schoolRouter;
