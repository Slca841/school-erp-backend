import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "school_erp/qr",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    public_id: () => `school_qr_${Date.now()}`, // ✅ FIX
  },
});

export const qrUpload = multer({ storage });
