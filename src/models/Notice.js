import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: String,
    message: String,
image: String,          
imagePublicId: String,
    targetType: String,
    targetClass: String,

createdByRole: {
  type: String,
  enum: ["admin", "teacher", "system"],
  default: "system",
},
createdById: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
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
