import User from "../models/userModel.js";
import Student from "../models/StudentModel.js";
import Teacher from "../models/TeacherModel.js";
import Class from "../models/classAssign.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";

// ✅ Token generator
const createToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

/* -------------------------------------------------------------------------- */
/* ✅ Login User */
/* -------------------------------------------------------------------------- */
export const loginUser = async (req, res) => {
  const { identifier, password, role } = req.body;

  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { name: identifier }],
    });

    if (!user)
      return res.json({ success: false, message: "User doesn't exist" });

    if (user.role !== role)
      return res.json({ success: false, message: "Invalid role selected" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.json({ success: false, message: "Invalid password" });

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated (TC Approved)",
      });
    }

    const token = createToken(user._id, user.role);

    // ✅ Student login
    if (role === "student") {
      const student = await Student.findOne({ userId: user._id });
      const classData = await Class.findOne({ name: student.studentclass });

      return res.json({
        success: true,
        token,
        role,
        studentId: student._id,
        name: user.name,
        email: user.email,
        className: student.studentclass,
        classId: classData?._id || null,
        message: "Student login successful",
      });
    }

    // ✅ Teacher login
    if (role === "teacher") {
      const teacher = await Teacher.findOne({ userId: user._id });
      const classData = await Class.findOne({ teacherId: teacher._id });

      return res.json({
        success: true,
        token,
        role,
        teacherId: teacher._id,
        name: teacher.fullName,
        email: user.email,
        className: classData?.name || null,
        classId: classData?._id || null,
        user: { _id: user._id },
        message: "Teacher login successful",
      });
    }

    // ✅ Admin login
    if (role === "admin") {
      return res.json({
        success: true,
        token,
        role,
        adminId: user._id,
        name: user.name,
        email: user.email,
        user: { _id: user._id },
        message: "Admin login successful",
      });
    }

    // ✅ Account login
    if (role === "account") {
      return res.json({
        success: true,
        token,
        role,
        name: user.name,
        email: user.email,
        message: "Account login successful",
      });
    }

    return res.json({ success: false, message: "Invalid role type" });
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Error occurred" });
  }
};

/* -------------------------------------------------------------------------- */
/* ✅ Register User (Admin, Teacher, Student, Account) */
/* -------------------------------------------------------------------------- */
export const registerUser = async (req, res) => {
  const {
    name,
    fullName,
    studentclass,
    rollNo,
    dateOfBirth,
    dateOfAdmission,
    password,
    email,
    role,
    gender,
    religion,
    studentFatherName,
    studentMotherName,
    contact1,
    contact2,
    scholarNo,
    aadharNo,
    samagraId,
    penNo,
    apaarId,
    address,
    // Teacher fields
    dateOfJoining,
    salary,
    contact,
    category,
    qualification,
    fatherName,
    motherName,

  } = req.body;

  try {
    // ✅ User validation
    const exists = await User.findOne({ $or: [{ email }, { name }] });
    if (exists)
      return res.json({ success: false, message: "User already exists" });

    if (!validator.isEmail(email))
      return res.json({ success: false, message: "Enter a valid email" });

   if (!password || password.length < 6) {
  return res.json({
    success: false,
    message: "Password must be at least 6 characters",
  });
}


    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(String(password || "1234"), 10);



    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      originalPassword: password,
      role,
      isActive: true,
      isTestUser: false,
    });

    // ✅ Student registration
    if (role === "student") {
      const student = await Student.create({
        userId: user._id,
        fullName,
        studentFatherName,
        studentMotherName,
        dateOfBirth,
        studentclass,
        rollNo,
        dateOfAdmission,
        category,
        gender,
        religion,
        contact1,
        contact2,
        scholarNo,
        aadharNo,
        samagraId,
        penNo,
        apaarId,
        address,
        status: "ACTIVE",
      });

      return res.status(201).json({
        success: true,
        message: "Student registered successfully",
        studentId: student._id,
        role,
      });
    }

    // ✅ Teacher registration (no coordinator)
    if (role === "teacher") {
      const teacher = await Teacher.create({
        userId: user._id,
        fullName,
        fatherName,
        motherName,
        dateOfBirth,
        dateOfJoining,
        qualification,
        category,
        gender,
        contact,
        aadharNo,
        address,
        salary,
      });

      return res.status(201).json({
        success: true,
        message: "Teacher registered successfully",
        teacherId: teacher._id,
        role,
      });
    }

    // ✅ Account registration
    if (role === "account") {
      const token = createToken(user._id, user.role);
      return res.status(201).json({
        success: true,
        token,
        role,
        name: user.name,
        email: user.email,
        message: "Account role registered successfully",
      });
    }

    // ✅ Admin registration
    const token = createToken(user._id, user.role);
    return res.json({
      success: true,
      token,
      role: user.role,
      name: user.name,
      message: "Registered successfully",
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return res.json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/* ✅ Admin Reset Password */
/* -------------------------------------------------------------------------- */
export const adminResetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword)
      return res
        .status(400)
        .json({ success: false, message: "Missing email or password" });

        if (newPassword.length < 6) {
  return res.status(400).json({
    success: false,
    message: "Password must be at least 6 characters",
  });
}

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    
    await user.save();

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("❌ Admin password reset error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* -------------------------------------------------------------------------- */
/* ✅ User Password Update */
/* -------------------------------------------------------------------------- */
export const updatePassword = async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.json({ success: false, message: "Old password incorrect" });

if (newPassword.length < 6)
  return res.json({
    success: false,
    message: "New password must be at least 6 characters",
  });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// in your controllers/userController.js
export const bulkRegister = async (req, res) => {
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: "No data found" });
    }

    const createdUsers = [];
    const skipped = [];

    const fixDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    for (const r of records) {
      try {
        if (!r.name || !r.email) {
          skipped.push({ record: r, reason: "Missing name/email" });
          continue;
        }

        const email = String(r.email).trim().toLowerCase();
        const name = String(r.name).trim();

        const exists = await User.findOne({ email });
        if (exists) {
          skipped.push({ record: r, reason: "Email already exists" });
          continue;
        }

        const plainPassword =
  r.password && String(r.password).length >= 6
    ? String(r.password)
    : "123456";

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // CREATE USER
        const user = await User.create({
          name,
          email,
          password: hashedPassword,
          originalPassword: plainPassword,
          role: r.role ? r.role.toLowerCase() : "student",
          isActive: true,
          isTestUser: false,
        });

        // GUARDIAN ALWAYS IGNORED
        const guardianData = null;

        // ONLY STUDENT (YOU CAN EXTEND FOR TEACHER LATER)
        if (user.role === "student") {
          await Student.create({
            userId: user._id,

            fullName: r.fullname || "Unknown",
            studentclass: r.studentclass || "NA",
            rollNo: r.rollno || "0",
            dateOfBirth: fixDate(r.dateofbirth) || new Date(),
            dateOfAdmission: fixDate(r.dateofadmission) || new Date(),


            studentFatherName: r.studentfathername || "",
            studentMotherName: r.studentmothername || "",
            category: r.category || "",
            gender: r.gender || "Male",
            religion: r.religion || "",
            contact1: r.contact1 || "",
            contact2: r.contact2 || "",

            scholarNo: r.scholarno || "",
            aadharNo: r.aadharno || "",
            samagraId: r.samagraid || "",
            penNo: r.penno || "",
            apaarId: r.apaarid || "",

            address: r.address || "",
            guardian: guardianData,
            status: "ACTIVE",
          });
        }

        createdUsers.push(email);

      } catch (err) {
        skipped.push({
          record: r,
          reason: err.message || "Creation error",
        });
      }
    }

    return res.json({
      success: true,
      message: `${createdUsers.length} users created, ${skipped.length} skipped`,
      created: createdUsers,
      skipped,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};





