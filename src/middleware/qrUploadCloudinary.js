import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../utils/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "school_erp/qr",
    public_id: "school_qr",   // ✅ SAME ID
    overwrite: true,          // ✅ FORCE OVERWRITE
    invalidate: true,         // ✅ CDN cache clear
    resource_type: "image",
  }),
});

export const qrUpload = multer({ storage });
