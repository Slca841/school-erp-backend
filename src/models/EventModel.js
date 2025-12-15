import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  type: { type: String, enum: ["holiday", "exam", "meeting", "event"], default: "event" },
});

const Event = mongoose.model("Event", eventSchema);
export default Event;