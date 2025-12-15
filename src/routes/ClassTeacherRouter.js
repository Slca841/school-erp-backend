import Class from "../models/classAssign.js";
// POST /api/admin/map-class
router.post("/map-class", async (req, res) => {
  try {
    const { className, teacherId } = req.body;
    if (!className || !teacherId) return res.status(400).json({ message: "Class & Teacher required" });

    const map = await Class.findOneAndUpdate(
      { className },
      { teacherId },
      { new: true, upsert: true }
    );

    res.json({ success: true, message: "Mapping saved", data: map });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
});

// GET all mappings
router.get("/map-class", async (req, res) => {
  const mappings = await Class.find().populate("teacherId", "name email");
  res.json({ success: true, mappings });
});
