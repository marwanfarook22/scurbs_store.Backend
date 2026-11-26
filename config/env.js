import { config } from "dotenv";

config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

export const PORT = process.env.PORT;
export const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";
export const CORS_ORIGINS = process.env.CORS_ORIGINS;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const DB_URL = process.env.DB_URL;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const ARCJET_API_KEY = process.env.ARCJET_API_KEY;
export const ARCJET_ENV = process.env.ARCJET_ENV;
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
