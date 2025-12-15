import express from "express";
import cors from "cors";
import http from "http";
import { Server as IOServer } from "socket.io";
import connectDB from "./config/db.js";

import feeReminderRouter from "./routes/feeReminder.js";
import userRouter from "./routes/userRoute.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import studentFeePaymentRoutes from "./routes/studentFeePaymentRoutes.js";
import classAssignRouter from "./routes/classAssignRouter.js";
import teacherRoutes from "./routes/teacherRoutes.js";
import attendanceRouter from "./routes/AttendanceRouter.js";
import complaintsRouter from "./routes/teacherComplaintRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import noticeRoutes from "./routes/noticeRoutes.js";
import homeworkRouter from "./routes/HomeworkRoute.js";
import subjectAssginRouter from "./routes/teacherSubjectRoutes.js";
import eventRouter from "./routes/event.js";
import schoolRouter from "./routes/schoolRoutes.js";

import "dotenv/config";
import { sendFeeReminder } from "./controllers/feeReminderController.js";
import helmet from "helmet";
import compression from "compression";



const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(helmet());
app.use(compression());


// ----------------------
// HTTP + Socket.IO Setup
// ----------------------
const server = http.createServer(app);

export const io = new IOServer(server, {
  cors: {
    origin: "*", // ⚠️ For production: use your frontend domain
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Allow routes to use io if needed
app.set("io", io);

// ----------------------
// Database Connection
// ----------------------
connectDB();

// ----------------------
// SOCKET.IO CONNECTION
// ----------------------
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);
  
  // ----------------------
  // USER JOIN ROOMS
  // ----------------------
  socket.on("join", (data) => {
    if (data.role === "admin") {
      socket.join("admins");
      console.log(`🧑‍💼 Admin joined room: admins`);
    }
    
    else if (data.role === "teacher") {
      socket.join("teachers");
      if (data.teacherId) socket.join(`teacher_${data.teacherId}`);
      console.log(`👨‍🏫 Teacher joined room: teacher_${data.teacherId}`);
    }
    
    else if (data.role === "student") {
      if (data.className) {
        socket.join(`class_${data.className}`);
        console.log(`🎓 Student joined class room: class_${data.className}`);
      }
      if (data.studentId) {
        socket.join(`student_${data.studentId}`);
        console.log(`📚 Student private room joined: student_${data.studentId}`);
      }
    }
  });
  
  // MANUAL STUDENT ROOM
  socket.on("join_student", (studentId) => {
    socket.join(`student_${studentId}`);
    console.log(`📘 Student joined room: student_${studentId}`);
  });
  
  socket.on("leave_room", (room) => {
    socket.leave(room);
    console.log(`📤 ${socket.id} left room: ${room}`);
  });
  
  // ------------------------------------------------
  // 🔥 REAL-TIME NOTICE EVENTS (IMPORTANT)
  // ------------------------------------------------
  
  // 1️⃣ Notice to all teachers
  socket.on("notice_to_teachers", () => {
    console.log("📢 Sending notice to all teachers...");
    io.to("teachers").emit("new_notice_teacher");
  });
  
  // 2️⃣ Notice to a specific class
  socket.on("notice_to_class", (className) => {
    console.log("🏫 Sending notice to class:", className);
    io.to(`class_${className}`).emit("new_notice_student");
  });
  
  // 3️⃣ Notice to all students
  socket.on("notice_to_all_students", () => {
    console.log("🌍 Sending notice to ALL students...");
    io.emit("new_notice_all");
  });
  
  // 4️⃣ Fee Reminder event
  socket.on("fee_reminder", (data) => {
    console.log("💸 Fee reminder emitted:", data);
    io.to(`class_${data.className}`).emit("fee_reminder", data);
  });
  
  // ----------------------
  // USER DISCONNECT
  // ----------------------
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// ----------------------
// API ROUTES
// ----------------------
app.use("/uploads", express.static("uploads"));

app.use("/api/user", userRouter);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/leave", leaveRoutes);
app.use("/api/payments", studentFeePaymentRoutes);
app.use("/api/assign", classAssignRouter);
app.use("/api/teachers", teacherRoutes);
app.use("/api/attendance", attendanceRouter);
app.use("/api/complaint", complaintsRouter);
app.use("/api/notice", noticeRoutes);
app.use("/api/homework", homeworkRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/subject", subjectAssginRouter);
app.use("/api/event", eventRouter);
app.use("/api/school", schoolRouter);

// Fee router
app.use(
  "/api/fee",
  (req, res, next) => {
    req.io = io;
    next();
  },
  feeReminderRouter
);

// ----------------------
// BASE ROUTE
// ----------------------
app.get("/", (req, res) => {
  res.send("✅ ERP Server Running Successfully!");
});

// ----------------------
// SERVER START
// ----------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
