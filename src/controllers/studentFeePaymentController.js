import StudentFeePayment from "../models/StudentFeePayment.js";


// 📌 Add new payment
export const addPayment = async (req, res) => {
  try {
    const { studentId, paidAmount, month, year } = req.body;

    if (!studentId || !paidAmount) {
      return res.status(400).json({ success: false, message: "StudentId and paidAmount required" });
    }

    const payment = new StudentFeePayment({
      studentId,
      paidAmount,
      month,
      year,
    });

    await payment.save();

    res.status(201).json({
      success: true,
      message: "Payment added successfully",
      payment,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error adding payment", error: err.message });
  }
};

// 📌 Get all payments of a student
export const getPaymentsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    const payments = await StudentFeePayment.find({ studentId }).sort({ date: -1 });

    res.status(200).json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching payments", error: err.message });
  }
};

// 📌 Update a payment
export const updatePayment = async (req, res) => {
  try {
    const { id } = req.params; // paymentId
    const updated = await StudentFeePayment.findByIdAndUpdate(id, req.body, { new: true });

    if (!updated) return res.status(404).json({ success: false, message: "Payment not found" });

    res.status(200).json({ success: true, message: "Payment updated", payment: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error updating payment", error: err.message });
  }
};

// 📌 Delete a payment
export const deletePayment = async (req, res) => {
  try {
    const { id } = req.params; // paymentId
    const deleted = await StudentFeePayment.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.status(200).json({ success: true, message: "Payment deleted" });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: "Error deleting payment", 
      error: err.message 
    });
  }
};
