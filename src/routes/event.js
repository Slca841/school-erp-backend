import express from "express";
import Event from "../models/EventModel.js";

const eventRouter = express.Router();

// 🟢 Create Event (Admin)
eventRouter.post("/create", async (req, res) => {
  try {
    const event = new Event(req.body);
    await event.save();
    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🟡 Get All Events (Everyone)
eventRouter.get("/all", async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 🔴 Delete Event (Admin)
eventRouter.delete("/delete/:id", async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default eventRouter;
