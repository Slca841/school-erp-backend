import mongoose from "mongoose";

const homeworkSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },

    homeworkDate: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    image: {
      type: String,
      default: "",
    },

    students: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },

        status: {
          type: String,
          enum: ["complete", "not_complete"],
          default: "not_complete",
        },
      },
    ],
  },
  { timestamps: true }
);

const Homework = mongoose.model("Homework", homeworkSchema);
export default Homework;