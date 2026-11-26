import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
} from "../Controllers/categories.controller.js";
import TokenAuth from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";

const categoriesRouter = Router();
const canManageCategories = [TokenAuth, authorizeRoles("admin", "moderator")];

categoriesRouter
  .route("/")
  .get(getAllCategories)
  .post(...canManageCategories, createCategory);

categoriesRouter.get("/:idOrSlug", getCategoryById);
categoriesRouter.put("/:id", ...canManageCategories, updateCategory);
categoriesRouter.patch("/:id", ...canManageCategories, updateCategory);
categoriesRouter.delete("/:id", ...canManageCategories, deleteCategory);

export default categoriesRouter;
