import { Router } from "express";
import {
  createManagedUser,
  getAllUsers,
  getUserById,
  UpdateUserInfo,
  deleteUser,
} from "../Controllers/user.controller.js";
import { signUp } from "../Controllers/auth.controller.js";
import TokenAuth from "../middleware/auth.middleware.js";
import {
  authorizeRoles,
  authorizeUserUpdate,
} from "../middleware/authorize.middleware.js";
// أضف هذا الاستدعاء في أعلى الملف
import { uploadProfileImage } from "../config/cloudinary.js";

// تحديث مسار التعديل ليدعم رفع صورة واحدة
const usersRouter = Router();
const canManageUsers = [TokenAuth, authorizeRoles("admin", "moderator")];
//GET / users
usersRouter.get("/", ...canManageUsers, getAllUsers);
// GET / users/:id
usersRouter.get("/:id", ...canManageUsers, getUserById);
usersRouter.post("/admin", ...canManageUsers, createManagedUser);
// POST / users
usersRouter.post(
  "/",
  uploadProfileImage.single("profileImage"),
  signUp,
);

//Update User
usersRouter.put(
  "/:id",
  TokenAuth,
  authorizeUserUpdate,
  uploadProfileImage.single("profileImage"),
  UpdateUserInfo,
);

// delete User
usersRouter.delete("/:id", ...canManageUsers, deleteUser);

export default usersRouter;
