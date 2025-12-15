import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: String,
    message: String,
image: String,          
imagePublicId: String,
    targetType: String,
    targetClass: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
        required: false, 

    },

    // ✅ FIXED HERE
    readBy: {
      type: [String],
      default: [],     
    },
  },
  { timestamps: true }
);

const Notice = mongoose.model("Notice", noticeSchema);
export default Notice;
