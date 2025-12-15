import express from "express";
import School from "../models/School.js";
import { qrUpload } from "../middleware/qrUploadCloudinary.js";

const schoolRouter = express.Router();

schoolRouter.put("/qr", qrUpload.single("qr"), async (req, res) => {
  try {
    const qrUrl = req.file?.path; // Cloudinary URL

    if (!qrUrl) {
      return res.status(400).json({ success: false, message: "QR not uploaded" });
    }

    let school = await School.findOne();
    if (!school) {
      school = await School.create({ qrImage: qrUrl });
    } else {
      school.qrImage = qrUrl;
      await school.save();
    }

    res.json({
      success: true,
      message: "QR updated",
      qrImage: qrUrl,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


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
