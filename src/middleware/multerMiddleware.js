import multer from "multer";
import path from "path";

// 🔔 Notice Image Upload
const noticeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/notices");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// 🔳 School QR Upload
const qrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/qr");
  },
  filename: (req, file, cb) => {
    cb(null, "school_qr" + path.extname(file.originalname)); // SAME NAME ALWAYS
  },
});
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only images allowed"), false);
};
export const noticeUpload = multer({ 
    storage: noticeStorage,  
     fileFilter,
    });
export const qrUpload = multer({ storage: qrStorage });
