// controllers/analyticsController.js
import mongoose from "mongoose";
import bcrypt from "bcrypt";

import User from "../models/userModel.js";
import Student from "../models/StudentModel.js";
import StudentFees from "../models/StudentFees.js";
import StudentFeePayment from "../models/StudentFeePayment.js";
import FeeHistory from "../models/FeeHistoryModel.js";
import ClassFeeMaster from "../models/ClassFeeMaster.js";
import Teacher from "../models/TeacherModel.js";

/* -------------------------------------------------------------------------- */
/* 🧹 DELETE OLD STUDENT ACADEMIC DATA */
/* -------------------------------------------------------------------------- */
import Attendance from "../models/Attendance.js";
import Homework from "../models/Homework.js";
import TeacherComplaint from "../models/TeacherComplaint.js";
import LeaveApplication from "../models/LeaveApplication.js";
import Notice from "../models/Notice.js";
import FeeReminder from "../models/FeeReminderModel.js";
import TransferCertificate from "../models/tcGenerator.js";

const deleteOldStudentData = async (studentId, oldClass, session = null) => {
  const options = session ? { session } : {};

  await Attendance.updateMany(
    {},
    { $pull: { students: { studentId } } },
    options
  );
  await TeacherComplaint.deleteMany({ studentId }, options);
  await LeaveApplication.deleteMany({ studentId }, options);
  await Notice.deleteMany({ targetClass: oldClass }, options);
  await FeeReminder.deleteMany({ studentId }, options);
};


/* -------------------------------------------------------------------------- */
/* 🧮 FEE CALCULATION (SINGLE SOURCE OF TRUTH) */
/* -------------------------------------------------------------------------- */
const getEffectiveFee = (studentFee, classFee) => {
  studentFee = studentFee || {};
  classFee = classFee || {}; // 🔥 THIS LINE FIXES CRASH

  const yearlyFee = Number(classFee.yearlyFee || 0);
  const previousYearFee = Number(studentFee.previousYearFee || 0);

  const pick = (studentVal, classVal) => {
    const s = Number(studentVal || 0);
    const c = Number(classVal || 0);
    return s > 0 ? s : c;
  };

  const examFee = pick(studentFee.examFee, classFee.examFee);
  const admissionFee = pick(studentFee.admissionFee, classFee.admissionFee);
  const smartClassFee = pick(studentFee.smartClassFee, classFee.smartClassFee);
  const annualFunctionFee = pick(studentFee.annualFunctionFee, classFee.annualFunctionFee);
  const diaryFee = pick(studentFee.diaryFee, classFee.diaryFee);
  const identityCardFee = pick(studentFee.identityCardFee, classFee.identityCardFee);
  const panalty = pick(studentFee.panalty, classFee.panalty);
  const otherCharges = pick(studentFee.otherCharges, classFee.otherCharges);
const transportationFee = pick(
  studentFee.transportationFee,
  classFee.transportationFee
);
  const otherFees =
    examFee +
    admissionFee +
    smartClassFee +
    annualFunctionFee +
    diaryFee +
    identityCardFee +
    panalty +
    otherCharges+
     transportationFee;

  const discount = Number(studentFee.discount || 0);

  const totalFee =
    yearlyFee + previousYearFee + otherFees - discount;

  return {
    yearlyFee,
    previousYearFee,
    otherFees,
    discount,
    totalFee,

    examFee,
    admissionFee,
    smartClassFee,
    annualFunctionFee,
    diaryFee,
    identityCardFee,
    panalty,
    otherCharges,
    transportationFee,
  };
};



/* -------------------------------------------------------------------------- */
/* 1️⃣ SET / UPDATE CLASS FEE */
/* -------------------------------------------------------------------------- */
export const setOrUpdateClassFee = async (req, res) => {
  try {
    const { className, feeType, feeAmount } = req.body;
    if (!className || !feeType)
      return res.status(400).json({ success: false, message: "Missing parameters" });

    let feeDoc = await ClassFeeMaster.findOne({ className });
    if (!feeDoc) feeDoc = new ClassFeeMaster({ className });

    feeDoc[feeType] = Number(feeAmount || 0);
    await feeDoc.save();

    res.json({
      success: true,
      message: `Updated ${feeType} for ${className}`,
      data: feeDoc,
    });
  } catch (err) {
    console.error("❌ setOrUpdateClassFee error:", err);
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 2️⃣ GET ALL CLASS FEES */
/* -------------------------------------------------------------------------- */
export const getAllClassFees = async (_, res) => {
  try {
    const data = await ClassFeeMaster.find().sort({ className: 1 });
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 3️⃣ APPLY CLASS FEES TO ALL STUDENTS */
/* -------------------------------------------------------------------------- */
export const applyClassFeesToStudents = async (req, res) => {
  const { className } = req.body;

const students = await Student.find({
  studentclass: className,
  status: "ACTIVE",
}).populate("userId");

const realStudents = students.filter(
  s => s.userId && !s.userId.isTestUser
);



for (const s of realStudents) {
  const exists = await StudentFees.findOne({ studentId: s._id });
  if (!exists) {
    await StudentFees.create({ studentId: s._id });
  }
}


  res.json({ success: true, message: "Student fee records ensured" });
};


/* -------------------------------------------------------------------------- */
/* 4️⃣ UPDATE STUDENT-SPECIFIC FEES */
/* -------------------------------------------------------------------------- */
export const updateOtherFees = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔒 ONLY ALLOWED FIELDS
    const payload = {
      examFee: Number(req.body.examFee || 0),
      admissionFee: Number(req.body.admissionFee || 0),
      smartClassFee: Number(req.body.smartClassFee || 0),
      annualFunctionFee: Number(req.body.annualFunctionFee || 0),
      diaryFee: Number(req.body.diaryFee || 0),
      identityCardFee: Number(req.body.identityCardFee || 0),
      panalty: Number(req.body.panalty || 0),
      otherCharges: Number(req.body.otherCharges || 0),
      discount: Number(req.body.discount || 0),
transportationFee: Number(req.body.transportationFee || 0),
    };

    let fees = await StudentFees.findOne({ studentId: id });

    if (fees) {
      fees = await StudentFees.findOneAndUpdate(
        { studentId: id },
        { $set: payload },
        { new: true }
      );
    } else {
      fees = await StudentFees.create({ studentId: id, ...payload });
    }

    res.json({
      success: true,
      message: "Student fees updated (previous year fee locked)",
      fees,
    });
  } catch (err) {
    console.error("❌ updateOtherFees error:", err);
    res.status(500).json({ success: false });
  }
};


/* -------------------------------------------------------------------------- */
/* 5️⃣ CLASS UPGRADE / DOWNGRADE */
/* -------------------------------------------------------------------------- */


export const upgradeOrDegradeClass = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { selectedStudents, type } = req.body;

    if (!Array.isArray(selectedStudents) || selectedStudents.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "No students selected" });
    }

    const classList = [
      "Nursery","LK-G","UK-G","1st","2nd","3rd","4th","5th",
      "6th","7th","8th","9th","10th","11th","12th"
    ];

    let updated = 0;

    for (const item of selectedStudents) {
 const student = await Student.findOne({
  _id: item.id,
  status: "ACTIVE",
})
.populate("userId")
.session(session);

if (!student || student.userId?.isTestUser) {
 continue; 
}

      const oldClass = student.studentclass;
      const index = classList.indexOf(oldClass);
      if (index === -1) throw new Error("Invalid class");

  if (
    (type === "upgrade" && index === classList.length - 1) ||
    (type === "degrade" && index === 0) 
  ) {
    continue; 
  }

      const nextClass =
        type === "upgrade" ? classList[index + 1] : classList[index - 1];

      if (!nextClass || (type === "upgrade" && oldClass === "12th")) {
        throw new Error("Invalid upgrade");
      }

      let feeRecord = await StudentFees.findOne({ studentId: student._id }).session(session);
      if (!feeRecord) {
        feeRecord = await StudentFees.create(
          [{ studentId: student._id }],
          { session }
        );
        feeRecord = feeRecord[0];
      }

      const oldClassFee = await ClassFeeMaster.findOne({ className: oldClass }).session(session);
      const payments = await StudentFeePayment.find({ studentId: student._id }).session(session);

      const totalPaid = payments.reduce((s, p) => s + (p.paidAmount || 0), 0);
      const effective = getEffectiveFee(feeRecord, oldClassFee);
      const remainingFee = Math.max(effective.totalFee - totalPaid, 0);

      // ❌ delete payment ONLY inside transaction
      await StudentFeePayment.deleteMany(
        { studentId: student._id },
        { session }
      );

      feeRecord.previousYearFee = remainingFee;

      const newClassFee = await ClassFeeMaster.findOne({ className: nextClass }).session(session);

      feeRecord.examFee = newClassFee?.examFee || 0;
      feeRecord.admissionFee = newClassFee?.admissionFee || 0;
      feeRecord.smartClassFee = newClassFee?.smartClassFee || 0;
      feeRecord.annualFunctionFee = newClassFee?.annualFunctionFee || 0;
      feeRecord.diaryFee = newClassFee?.diaryFee || 0;
      feeRecord.identityCardFee = newClassFee?.identityCardFee || 0;
      feeRecord.panalty = newClassFee?.panalty || 0;
      feeRecord.otherCharges = newClassFee?.otherCharges || 0;

      await feeRecord.save({ session });

      student.previousClass = oldClass;
      student.studentclass = nextClass;

      // 🔒 IMPORTANT: validation error aaye to rollback hoga
      await student.save({ session });

      await FeeHistory.create(
        [{
          studentId: student._id,
          action: type === "upgrade" ? "Class Upgrade" : "Class Downgrade",
          oldClass,
          newClass: nextClass,
          carriedForwardFee: remainingFee,
        }],
        { session }
      );

      await deleteOldStudentData(student._id, oldClass, session);
      updated++;
    }

    // ✅ ALL OK → COMMIT
    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: `Updated ${updated} students` });

  } catch (err) {
    // ❌ ANY ERROR → FULL ROLLBACK
    await session.abortTransaction();
    session.endSession();

    console.error("❌ Upgrade rollback:", err.message);

    res.status(500).json({
      success: false,
      message: "Upgrade failed. No data was changed.",
    });
  }
};


/* -------------------------------------------------------------------------- */
/* 6️⃣ FEE SUMMARY */
/* -------------------------------------------------------------------------- */

export const getFeeSummary = async (_, res) => {
  try {
  const students = await Student.find().populate("userId");
    const fees = await StudentFees.find();
    const payments = await StudentFeePayment.find();

    /* ===============================
       ✅ TC STUDENTS निकालो
    =============================== */
    const tcStudents = await TransferCertificate.find().select("studentId");
    const tcStudentIds = tcStudents.map(tc => tc.studentId.toString());

    /* ===============================
       ✅ ACTIVE STUDENTS COUNT
    =============================== */

const activeStudents = students.filter(
  s =>
    s.status === "ACTIVE" &&
    s.userId &&
    !s.userId.isTestUser
);

    const maleCount = activeStudents.filter(s => s.gender === "Male").length;
    const femaleCount = activeStudents.filter(s => s.gender === "Female").length;

    /* ===============================
       ❌ FEE LOGIC SAME (UNCHANGED)
    =============================== */
    let totalFee = 0;
for (const s of activeStudents) {
  const fee = fees.find(f => f.studentId.toString() === s._id.toString());
  const classFee = await ClassFeeMaster.findOne({ className: s.studentclass });
  const effective = getEffectiveFee(fee, classFee);
  totalFee += effective.totalFee;
}


    const totalPaid = payments.reduce((s, p) => s + (p.paidAmount || 0), 0);

    res.json({
      success: true,
      totalStudents: activeStudents.length, // ✅ FIXED
      totalFee,
      totalPaid,
      totalRemaining: totalFee - totalPaid,
      maleCount,
      femaleCount,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 7️⃣ ALL STUDENTS WITH FEES */
/* -------------------------------------------------------------------------- */
export const getAllStudentWithFeeDetails = async (_, res) => {
  try {
    const students = await Student.find().populate("userId");

const realStudents = students.filter(
  s => s.userId && !s.userId.isTestUser
);

    const fees = await StudentFees.find();
    const payments = await StudentFeePayment.find();

    const data = await Promise.all(
      realStudents.map(async (s) => {
        const fee = fees.find(
          (f) => f.studentId.toString() === s._id.toString()
        );

        const classFee = await ClassFeeMaster.findOne({
          className: s.studentclass,
        });

        const effective = getEffectiveFee(fee, classFee);

        const paid = payments.filter(
          (p) => p.studentId.toString() === s._id.toString()
        );

        const totalPaid = paid.reduce(
          (sum, p) => sum + (p.paidAmount || 0),
          0
        );

        return {
          _id: s._id,
          fullName: s.fullName,
          studentclass: s.studentclass,
          studentFatherName: s.studentFatherName,
   contact1: s.contact1,
          // 🔥 SEND ALL CALCULATED FIELDS
          yearlyFee: effective.yearlyFee,
          previousYearFee: effective.previousYearFee,
          otherFees: effective.otherFees,
          discount: effective.discount,
          totalFee: effective.totalFee,

          totalPaid,
          remainingFee: effective.totalFee - totalPaid,
        };
      })
    );

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ getAllStudentWithFeeDetails error:", err);
    res.status(500).json({ success: false });
  }
};


/* -------------------------------------------------------------------------- */
/* 8️⃣ SINGLE STUDENT FEES */
/* -------------------------------------------------------------------------- */
export const getSingleStudentWithFeeDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id).populate(
      "userId",
      "name email originalPassword role isActive"
    );
    if (!student)
      return res.json({ success: false, message: "Student not found" });

    const fee = await StudentFees.findOne({ studentId: id });
    const classFee = await ClassFeeMaster.findOne({
      className: student.studentclass,
    });
    const effective = getEffectiveFee(fee, classFee);
    
  let totalPaid = 0;
let payments = [];
// 🔴 TC APPROVED → snapshot use karo
if (student.status === "TC_APPROVED") {
  const tc = await TransferCertificate.findOne({ studentId: id });
  totalPaid = tc?.totalPaidAmount || 0;
} else {
  // 🟢 ACTIVE → live payments
   payments = await StudentFeePayment.find({ studentId: id });
  totalPaid = payments.reduce(
    (sum, p) => sum + (p.paidAmount || 0),
    0
  );
}


res.json({
  success: true,
  student: {
    ...student._doc,

    yearlyFee: effective.yearlyFee,
    previousYearFee: effective.previousYearFee,

    // 🔥 SEND BREAKUP
    examFee: effective.examFee,
    admissionFee: effective.admissionFee,
    smartClassFee: effective.smartClassFee,
    annualFunctionFee: effective.annualFunctionFee,
    diaryFee: effective.diaryFee,
    identityCardFee: effective.identityCardFee,
    panalty: effective.panalty,
    otherCharges: effective.otherCharges,

    otherFees: effective.otherFees,
    discount: effective.discount,
    totalFee: effective.totalFee,

    totalPaid,
    remainingFee: effective.totalFee - totalPaid,
    monthlyPayments: payments,
  },
});

  } catch (err) {
    console.error("❌ getSingleStudentWithFeeDetails error:", err);
    res.status(500).json({ success: false });
  }
};


/* -------------------------------------------------------------------------- */
/* 9️⃣ TODAY'S BIRTHDAYS */
/* -------------------------------------------------------------------------- */
export const getTodaysBirthdays = async (_, res) => {
  try {
    const today = new Date();
    const d = today.getDate();
    const m = today.getMonth();

const students = await Student.find({ status: "ACTIVE" }).populate("userId");

const realStudents = students.filter(
  s => s.userId && !s.userId.isTestUser
);


    const teachers = await Teacher.find();

    res.json({
      success: true,
      
       students: realStudents.filter(s => new Date(s.dateOfBirth).getDate() === d && new Date(s.dateOfBirth).getMonth() === m),
       teachers: teachers.filter(t => new Date(t.dateOfBirth).getDate() === d && new Date(t.dateOfBirth).getMonth() === m),
    });
  } catch {
    res.status(500).json({ success: false });
  }
};

/* -------------------------------------------------------------------------- */
/* 🔟 UPDATE STUDENT PROFILE */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* 🔟 UPDATE STUDENT PROFILE (STUDENT + GUARDIAN + USER) */
/* -------------------------------------------------------------------------- */
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });

    const user = await User.findById(student.userId);
    if (!user)
      return res.status(404).json({ success: false, message: "Linked user not found" });

    /* ================= USER ================= */
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;

    if (req.body.password && req.body.password.trim()) {
      const hashed = await bcrypt.hash(req.body.password, 10);
      user.password = hashed;
      user.originalPassword = req.body.password;
    }
    await user.save();

    /* ================= STUDENT ================= */
    const {
      guardian,
      ...studentFields
    } = req.body;

    Object.keys(studentFields).forEach(
      (k) => studentFields[k] === undefined && delete studentFields[k]
    );

    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      {
        $set: {
          ...studentFields,
          guardian: guardian || null, // ✅ FULL GUARDIAN UPDATE
        },
      },
      { new: true, runValidators: true }
    ).populate("userId", "name email originalPassword");

    res.json({
      success: true,
      message: "Student updated successfully",
      student: updatedStudent,
    });

  } catch (err) {
    console.error("❌ updateStudent error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



/* -------------------------------------------------------------------------- */
/* 🗑️ DELETE STUDENT COMPLETELY */
/* -------------------------------------------------------------------------- */
export const deleteStudentCompletely = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Find student first
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const userId = student.userId; // 👈 save before delete

    // 🧹 Delete related collections
    await StudentFees.deleteMany({ studentId: id });
    await StudentFeePayment.deleteMany({ studentId: id });
    await FeeHistory.deleteMany({ studentId: id });

    // 🗂️ Archive / old data cleanup
    await deleteOldStudentData(id, student.studentclass);

    // ❌ Delete student
    await Student.findByIdAndDelete(id);

    // ❌ Delete linked user account
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    res.json({
      success: true,
      message: "Student and user deleted completely",
    });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete student completely",
    });
  }
};



/* 🟢 ACTIVE STUDENTS */
export const getActiveStudents = async (req, res) => {

  try {
    const { class: classFilter, search, fee } = req.query;

let query = { status: "ACTIVE" };

if (classFilter) {
  query.studentclass = classFilter;
}

if (search) {
  query.fullName = { $regex: search, $options: "i" };
}
  const total = await Student.countDocuments(query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // 🔥 STEP 1: Fetch students WITH userId
const students = await Student.find(query)
      .populate("userId", "isTestUser")
      .select("fullName studentclass studentFatherName contact1 userId")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // 🔥 STEP 2: Filter real students
    const activeStudents = students.filter(
      (s) => s.userId && !s.userId.isTestUser
    );

    const studentIds = activeStudents.map((s) => s._id);

    // 🔥 STEP 3: Fetch all related data (NO LOOP QUERY)
    const [fees, payments, classFees] = await Promise.all([
      StudentFees.find({ studentId: { $in: studentIds } }).lean(),
      StudentFeePayment.find({ studentId: { $in: studentIds } }).lean(),
      ClassFeeMaster.find().lean(), // ✅ ALL class fees
    ]);

    // 🔥 STEP 4: Build maps (FAST lookup)
    const classFeeMap = {};
    classFees.forEach((c) => {
      classFeeMap[c.className] = c;
    });

    const paymentMap = {};
    payments.forEach((p) => {
      const id = p.studentId.toString();
      if (!paymentMap[id]) paymentMap[id] = 0;
      paymentMap[id] += p.paidAmount || 0;
    });

    const feeMap = {};
    fees.forEach((f) => {
      feeMap[f.studentId.toString()] = f;
    });

    // 🔥 STEP 5: Build final data (NO extra DB call)
    const data = activeStudents.map((s) => {
      const id = s._id.toString();

      const fee = feeMap[id];
      const classFee = classFeeMap[s.studentclass];

      const effective = getEffectiveFee(fee, classFee);
      const totalPaid = paymentMap[id] || 0;

      return {
        _id: s._id,
        fullName: s.fullName,
        studentclass: s.studentclass,
        studentFatherName: s.studentFatherName,
        contact1: s.contact1,

        yearlyFee: effective.yearlyFee,
        previousYearFee: effective.previousYearFee,
        otherFees: effective.otherFees,
        discount: effective.discount,
        totalFee: effective.totalFee,

        totalPaid,
        remainingFee: effective.totalFee - totalPaid,
      };
    });

    res.json({
      success: true,
      page,
      total,
      count: data.length,
      students: data,
    });

  } catch (err) {
    console.error("❌ getActiveStudents error:", err);
    res.status(500).json({ success: false });
  }
};


/* 🔴 TC APPROVED STUDENTS */
export const getTCStudents = async (req, res) => {
  try {
const students = await Student.find({ status: "TC_APPROVED" }).populate("userId");

const realStudents = students.filter(
  s => s.userId && !s.userId.isTestUser
);


    const fees = await StudentFees.find();
  

    const data = await Promise.all(
      realStudents.map(async (s) => {
        const fee = fees.find(
          (f) => f.studentId.toString() === s._id.toString()
        );

        const classFee = await ClassFeeMaster.findOne({
          className: s.studentclass,
        });

        const effective = getEffectiveFee(fee, classFee);

const tc = await TransferCertificate.findOne({ studentId: s._id });

const totalPaid = tc?.totalPaidAmount || 0;


        return {
          _id: s._id,
          fullName: s.fullName,
          studentclass: s.studentclass,
          studentFatherName: s.studentFatherName,
          contact1: s.contact1,

          yearlyFee: effective.yearlyFee,
          previousYearFee: effective.previousYearFee,
          otherFees: effective.otherFees,
          discount: effective.discount,
          totalFee: effective.totalFee,

          totalPaid,
          remainingFee: effective.totalFee - totalPaid,
        };
      })
    );

    res.json({ success: true, students: data });
  } catch (err) {
    console.error("❌ getTCStudents error:", err);
    res.status(500).json({ success: false });
  }
};

