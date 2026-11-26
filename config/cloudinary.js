import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from "./env.js";

// 1. إعداد الاتصال بحسابك
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// 2. إعداد مساحة التخزين الخاصة بـ Multer لترفع مباشرة إلى Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "Ecommerce_Users", // اسم المجلد الذي سيتم إنشاؤه في حسابك لحفظ الصور
    allowed_formats: ["jpg", "png", "jpeg", "webp"], // الصيغ المسموح بها
    // يمكنك لاحقاً إضافة transformation لتصغير حجم الصورة تلقائياً
  },
});

const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "Ecommerce_Products",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

const scrollSnapStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "Ecommerce_ScrollSnap",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});

// 3. تصدير الميدل وير الجاهز للاستخدام
export const uploadProfileImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedImageTypes.includes(file.mimetype)) {
      return callback(new Error("Profile images must be JPG, PNG, or WEBP."));
    }

    callback(null, true);
  },
});
export const uploadProductImage = multer({
  storage: productStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedImageTypes.includes(file.mimetype)) {
      return callback(new Error("Images must be JPG, PNG, or WEBP."));
    }

    callback(null, true);
  },
});
export const uploadScrollSnapImage = multer({
  storage: scrollSnapStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedImageTypes.includes(file.mimetype)) {
      return callback(new Error("Images must be JPG, PNG, or WEBP."));
    }

    callback(null, true);
  },
});

export { cloudinary };
