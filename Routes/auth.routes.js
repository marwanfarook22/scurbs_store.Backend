import { Router } from "express";

import {
  signUp,
  Login,
  googleLogin,
  Logout,
} from "../Controllers/auth.controller.js";
import { uploadProfileImage } from "../config/cloudinary.js";

const authRouter = Router();

// path: /api/v1/auth/sign-up (Post)
authRouter.post(
  "/signUp",
  uploadProfileImage.single("profileImage"),
  signUp,
);
// path: /api/v1/auth/login (Post)
authRouter.post("/login", Login);
authRouter.post("/google", googleLogin);
//path: /api/v1/auth/logout (Post)
authRouter.post("/logout", Logout);


export default authRouter;
