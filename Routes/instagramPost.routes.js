import { Router } from "express";
import {
  createInstagramPost,
  deleteInstagramPost,
  getInstagramPosts,
} from "../Controllers/instagramPost.controller.js";
import TokenAuth from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";
import { uploadScrollSnapImage } from "../config/cloudinary.js";

const instagramPostRouter = Router();
const canManageInstagramPosts = [
  TokenAuth,
  authorizeRoles("admin", "moderator"),
];

instagramPostRouter.get("/", getInstagramPosts);
const handleImageUpload = (req, res, next) => {
  uploadScrollSnapImage.single("image")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Image size must not exceed 5 MB."
            : error.message,
      });
    }

    next();
  });
};

instagramPostRouter.post(
  "/",
  ...canManageInstagramPosts,
  handleImageUpload,
  createInstagramPost,
);
instagramPostRouter.delete(
  "/:id",
  ...canManageInstagramPosts,
  deleteInstagramPost,
);

export default instagramPostRouter;
