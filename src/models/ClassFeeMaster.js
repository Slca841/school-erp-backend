import mongoose from "mongoose";

const classFeeMasterSchema = new mongoose.Schema({
  className: { type: String, required: true, unique: true },
  yearlyFee: { type: Number, default: 0 },
  examFee: { type: Number, default: 0 },
  smartClassFee: { type: Number, default: 0 },
  admissionFee: { type: Number, default: 0 },
  annualFunctionFee: { type: Number, default: 0 },
  diaryFee: { type: Number, default: 0 },
  identityCardFee: { type: Number, default: 0 },
  panalty: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
}, { timestamps: true });

 
const ClassFeeMaster = mongoose.model("ClassFeeMaster", classFeeMasterSchema);
export default ClassFeeMaster;