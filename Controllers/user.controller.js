import Usermodule from "../models/users.models.js";
import bcrypt from "bcryptjs";
import { normalizePhoneNumber } from "../utils/phoneNumber.js";
import { isGmailAddress } from "../utils/emailAddress.js";

export const createManagedUser = async (req, res, next) => {
  try {
    const { name, email, phoneNumber, password } = req.body;
    const role = req.body.role || "user";

    if (!name || !email || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone number, and password are required.",
      });
    }
    if (!isGmailAddress(email)) {
      return res.status(400).json({
        success: false,
        message: "Please use a valid Gmail address ending in @gmail.com.",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    if (role !== "user" && req.user.role !== "moderator") {
      return res.status(403).json({
        success: false,
        message: "Only moderators can create accounts with elevated roles.",
      });
    }

    const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await Usermodule.create({
      name,
      email: email.trim().toLowerCase(),
      phoneNumber: normalizedPhoneNumber,
      password: hashedPassword,
      role,
    });

    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({
      success: true,
      data: safeUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = error.keyPattern?.phoneNumber ? "phone number" : "email";
      return res.status(409).json({
        success: false,
        message: `This ${field} is already registered.`,
      });
    }
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const usersfetch = await Usermodule.find(
      {},
      "-passwordSentAtAttempts",
    );
    res.status(200).json({
      success: true,
      data: usersfetch,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await Usermodule.findById(
      req.params.id,
      "-passwordSentAtAttempts",
    );

    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (e) {
    next(e);
  }
};

export const UpdateUserInfo = async (req, res, next) => {
  try {
    const userId = req.params.id; // استخراج الـ ID من الرابط
    const { name, email, phoneNumber, oldPassword, newPassword, role } =
      req.body;

    // --- التحديث الجديد: استخراج رابط الصورة من الملف المرفوع ---
    let profileImageUrl;
    if (req.file) {
      profileImageUrl = req.file.path; // الرابط الجاهز القادم من Cloudinary
    }

    // 1. جلب المستخدم من قاعدة البيانات
    const user = await Usermodule.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (role && req.user.role !== "moderator") {
      return res.status(403).json({
        success: false,
        message: "Only moderators can change user roles.",
      });
    }

    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (
      email &&
      normalizedEmail !== user.email.toLowerCase() &&
      !isGmailAddress(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please use a valid Gmail address ending in @gmail.com.",
      });
    }

    // 2. منطق تحديث كلمة المرور
    if (newPassword) {
      // التحقق من إرسال الباسورد القديم أولاً
      if (!oldPassword) {
        return res.status(400).json({
          success: false,
          message: "Please provide your old password to set a new one.",
        });
      }

      // مقارنة الباسورد القديم بالباسورد المشفر في قاعدة البيانات
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Incorrect old password.",
        });
      }

      // تم إزالة res.status(200) من هنا لمنع خطأ (Headers already sent)

      // إذا كان صحيحاً، نقوم بتشفير الباسورد الجديد
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // 3. تحديث باقي البيانات في حال تم إرسالها في الطلب (req.body)
    if (name) user.name = name;
    if (email) user.email = normalizedEmail;
    if (phoneNumber) user.phoneNumber = phoneNumber; // سيتم التحقق منه تلقائياً بواسطة المكتبة

    // --- التحديث الجديد: تحديث حقل الصورة إذا تم رفع ملف ---
    if (profileImageUrl) {
      user.profileImage = profileImageUrl;
    }

    // 4. --- منطق تعديل الصلاحيات (Role) ---
    if (role) {
      //   console.log(req.user);
      user.role = role;
    }

    // 5. حفظ التعديلات
    // استخدام user.save() هنا مهم جداً بدلاً من findByIdAndUpdate
    // لأنه يقوم بتشغيل الـ Validators والـ Setters الخاصة برقم الهاتف التي برمجناها مسبقاً
    await user.save();

    const safeUser = user.toObject();
    delete safeUser.password;
    safeUser.phone = user.phoneNumber || "";

    res.status(200).json({
      success: true,
      message: "User information updated successfully",
      data: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id; // استخراج الـ ID الخاص بالمستخدم المراد حذفه من الرابط
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account from the dashboard.",
      });
    }

    // البحث عن المستخدم وحذفه في خطوة واحدة
    const deletedUser = await Usermodule.findByIdAndDelete(userId);

    // التحقق مما إذا كان المستخدم موجوداً بالفعل
    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found or already deleted",
      });
    }

    // إرسال رد بنجاح العملية
    res.status(200).json({
      success: true,
      message: "User account has been deleted successfully by moderator",
    });
  } catch (error) {
    next(error); // تمرير أي خطأ برمجي أو خطأ في صيغة الـ ID لمعالج الأخطاء
  }
};
