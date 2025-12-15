import express from "express";
import School from "../models/School.js";
import { qrUpload } from "../middleware/qrUploadCloudinary.js";

const schoolRouter = express.Router();

schoolRouter.put("/qr", qrUpload.single("qr"), async (req, res) => {
    try {
      console.log("QR FILE 👉", req.file); // 🔥 TEMP LOG

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No QR image uploaded",
        });
      }

      const qrPath = req.file.path;

      const school = await School.findOne();
      if (!school) {
        await School.create({ qrImage: qrPath });
      } else {
        school.qrImage = qrPath;
        await school.save();
      }

      res.json({ success: true, qr: qrPath });
    } catch (err) {
      console.error("QR UPLOAD ERROR ❌", err);
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
