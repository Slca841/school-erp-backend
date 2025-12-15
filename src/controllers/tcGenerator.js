import TransferCertificate from "../models/tcGenerator.js";

export const approveTC = async (req, res) => {
  try {
    const { id } = req.params; // studentId

    // ✅ Find last TC of this student only
    const lastTC = await TransferCertificate.findOne({ studentId: id }).sort({ tcNumber: -1 });
    const newNumber = lastTC ? lastTC.tcNumber + 1 : 1;

    const tc = await TransferCertificate.create({
      studentId: id,
      tcNumber: newNumber,
      approved: true,
      dateOfLeaving: new Date(),
      reason: "On Request"
    });

    res.status(200).json({ success: true, message: "TC Approved Successfully", tc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error approving TC", error: err.message });
  }
};
// ✅ GET TC by studentId
export const getStudentTC = async (req, res) => {
  try {
    const { id } = req.params; // studentId
    const tc = await TransferCertificate.findOne({ studentId: id });

    if (!tc) {
      return res.status(404).json({ success: false, message: "No TC found" });
    }

    res.status(200).json({ success: true, tc });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching TC", error: err.message });
  }
};
export const getAllTCs = async (req, res) => {
  try {
    const tcs = await TransferCertificate.find()
      .populate("studentId", "fullName studentclass rollNo")
      .sort({ createdAt: -1 }); // latest first

    res.status(200).json({ success: true, tcs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching TCs", error: err.message });
  }
};

// GET /api/students/tc/:id
export const studentTcs = async (req, res) => {
  try {
    const { id } = req.params;
    const tcs = await TransferCertificate.find({ studentId: id })
      .populate("studentId", "fullName studentclass rollNo")
      .sort({ createdAt: -1 });

    res.json({ success: true, tcs });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching TC history", error: err.message });
  }
};
