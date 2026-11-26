import mongoose from "mongoose";
import { isValidPhoneNumber } from "libphonenumber-js";
import { normalizePhoneNumber } from "../utils/phoneNumber.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters long"],
      maxlength: [25, "Name must be at most 25 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: [true, "Email must be unique"],
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "Email is invalid"],
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      required: [
        function () {
          return this.authProvider === "local";
        },
        "Password is required",
      ],
      minlength: [6, "Password must be at least 6 characters long"],
    },

    // 1. نظام الصلاحيات الأفضل
    role: {
      type: String,
      enum: ["user", "admin", "moderator"], // الخيارات المسموح بها فقط
      default: "user",
    },

    phoneNumber: {
      type: String,
      required: [
        function () {
          return this.authProvider === "local";
        },
        "Phone number is required",
      ],
      unique: true,
      sparse: true,
      trim: true,
      set: normalizePhoneNumber,
      validate: {
        validator: function (value) {
          // 2. أضفنا "EG" هنا كدولة افتراضية للمساعدة في التحقق
          return isValidPhoneNumber(value, "EG");
        },
        message:
          "Please enter a valid international phone number (e.g., +201000000000)",
      },
    },

    profileImage: {
      type: String,
      default:
        "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
    },

  },
  { timestamps: true },
);

userSchema.virtual("phone")
  .get(function () {
    return this.phoneNumber;
  })
  .set(function (value) {
    this.phoneNumber = value;
  });

const Usermodule = mongoose.model("User", userSchema);

export default Usermodule;
