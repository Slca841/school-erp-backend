import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const authMiddleware = (req, res, next) => {
  try {
    // ✅ Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Attach user to request
    req.user = decoded;

    next(); // continue
  } catch (err) {
    console.error("❌ Auth middleware error:", err.message);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// middleware/adminCheck.js
const adminCheck = (req, res, next) => {
  // Assume req.user set by auth middleware
  if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Forbidden" });
  next();
};

const accountCheck = (req, res, next) => {
  if (req.user && ["account", "admin"].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ success: false, message: "Access denied: Accounts only" });
  }
};


export { authMiddleware, adminCheck, accountCheck };
