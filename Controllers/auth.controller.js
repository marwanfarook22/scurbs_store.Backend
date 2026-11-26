import mongoose from "mongoose";
import Usermodule from "../models/users.models.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  GOOGLE_CLIENT_ID,
} from "../config/env.js";
import { isValidPhoneNumber } from "libphonenumber-js";
import { normalizePhoneNumber } from "../utils/phoneNumber.js";
import { isGmailAddress } from "../utils/emailAddress.js";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const createUserToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phoneNumber || "",
      role: user.role,
      authProvider: user.authProvider,
      profileImage: user.profileImage,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );

const toSafeUser = (user) => {
  const safeUser = user.toObject();
  delete safeUser.password;
  safeUser.phone = user.phoneNumber || "";
  return safeUser;
};

export const signUp = async (req, res, next) => {
  let session;

  try {
    const { name, email, password, phoneNumber } = req.body;
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!isGmailAddress(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please use a valid Gmail address ending in @gmail.com.",
      });
    }

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);

    const existingUser = await Usermodule.findOne({
      $or: [{ email: normalizedEmail }, { phoneNumber: normalizedPhoneNumber }],
    });
    if (existingUser) {
      const duplicateField =
        existingUser.phoneNumber === normalizedPhoneNumber
          ? "phone number"
          : "email";
      return res.status(409).json({
        success: false,
        message:
          duplicateField === "phone number"
            ? "This phone number is already registered"
            : "User already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    session = await mongoose.startSession();
    session.startTransaction();

    const newUser = await Usermodule.create(
      [
        {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          phoneNumber: normalizedPhoneNumber,
          ...(req.file && { profileImage: req.file.path }),
        },
      ],
      { session },
    );

    const token = createUserToken(newUser[0]);

    await session.commitTransaction();
    session.endSession();
    session = null;

    const safeUser = toSafeUser(newUser[0]);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    session?.endSession();

    if (error.code === 11000 && error.keyPattern?.phoneNumber) {
      return res.status(409).json({
        success: false,
        message: "This phone number is already registered",
      });
    }

    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    next(error);
  }
};
export const Login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. التحقق من إرسال الإيميل وكلمة المرور
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // 2. البحث عن المستخدم في قاعدة البيانات
    // (نستخدم User.findOne هنا بافتراض أنك قمت باستدعاء موديل المستخدم في أعلى الملف)
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    const user = await Usermodule.findOne({ email: normalizedEmail });
    if (!user?.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials", // نستخدم رسالة عامة لأسباب أمنية
      });
    }

    // 3. مقارنة كلمة المرور المدخلة بالكلمة المشفرة في قاعدة البيانات
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // 4. إنشاء التوكن (JWT) في حال نجاح تسجيل الدخول
    const token = createUserToken(user);

    const safeUser = toSafeUser(user);

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: {
        token,
        user: safeUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    const credential = req.body.credential || req.body.idToken;
    if (typeof credential !== "string" || !credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required.",
      });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        success: false,
        message: "Google sign-in is not configured on the server.",
      });
    }

    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid Google credential.",
      });
    }
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub || payload.email_verified !== true) {
      return res.status(401).json({
        success: false,
        message: "Google account verification failed.",
      });
    }

    const email = payload.email.trim().toLowerCase();
    let user = await Usermodule.findOne({ email });

    if (!user) {
      user = await Usermodule.create({
        name: payload.name || email.split("@")[0],
        email,
        authProvider: "google",
        googleId: payload.sub,
        ...(payload.picture ? { profileImage: payload.picture } : {}),
      });
    } else {
      let shouldSave = false;
      if (!user.googleId) {
        user.googleId = payload.sub;
        shouldSave = true;
      }
      if (!user.profileImage && payload.picture) {
        user.profileImage = payload.picture;
        shouldSave = true;
      }
      if (shouldSave) await user.save();
    }

    const token = createUserToken(user);
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: {
        token,
        user: toSafeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const Logout = async (req, res, next) => {
  try {
    // في نظام الـ JWT، عملية تسجيل الخروج الفعلية تتم من جانب الـ Frontend (Client-side)
    // عن طريق حذف التوكن من الـ Local Storage أو الـ Cookies.
    // دور الباك إند هنا هو فقط إرسال رسالة نجاح تؤكد استلام الطلب.

    res.status(200).json({
      success: true,
      message: "User logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};

