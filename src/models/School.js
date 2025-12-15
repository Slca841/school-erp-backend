import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema({
  name: String,

  qrImage: {
    type: String, // sirf path
    default: null,
  },
});

const School = mongoose.model("School", schoolSchema);
export default School;
