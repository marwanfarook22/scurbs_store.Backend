import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "../Controllers/product.controller.js";
import TokenAuth from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";
import {
  createComment,
  deleteComment,
} from "../Controllers/comment.controller.js";
import {
  createProductDetail,
  deleteProductDetail,
  getProductDetailById,
  getProductDetails,
  updateProductDetail,
} from "../Controllers/productDetail.controller.js";
import { cloudinary, uploadProductImage } from "../config/cloudinary.js";

const productRouter = Router();
const canManageProducts = [TokenAuth, authorizeRoles("admin", "moderator")];
const uploadProductImages = (req, res, next) => {
  uploadProductImage.array("images", 10)(req, res, async (error) => {
    if (error) {
      const cleanupResults = await Promise.allSettled(
        (req.files || [])
          .filter((file) => file.filename)
          .map((file) => cloudinary.uploader.destroy(file.filename)),
      );
      cleanupResults.forEach((result) => {
        if (result.status === "rejected") {
          console.error(
            "Failed to clean up uploaded product images:",
            result.reason,
          );
        }
      });

      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Each image must not exceed 10 MB."
          : error.code === "LIMIT_UNEXPECTED_FILE"
            ? "You can upload up to 10 images."
            : error.message;
      return res.status(400).json({ success: false, message });
    }

    next();
  });
};

productRouter
  .route("/")
  .get(getAllProducts)
  .post(...canManageProducts, createProduct);

productRouter.get("/:productId/details", getProductDetails);
productRouter.post(
  "/:productId/details",
  ...canManageProducts,
  uploadProductImages,
  createProductDetail,
);
productRouter.get("/details/:detailId", getProductDetailById);
productRouter.put(
  "/details/:detailId",
  ...canManageProducts,
  uploadProductImages,
  updateProductDetail,
);
productRouter.patch(
  "/details/:detailId",
  ...canManageProducts,
  uploadProductImages,
  updateProductDetail,
);
productRouter.delete(
  "/details/:detailId",
  ...canManageProducts,
  deleteProductDetail,
);

productRouter.get("/:idOrSlug", getProductById);
productRouter.put(
  "/:id",
  ...canManageProducts,
  updateProduct,
);
productRouter.patch(
  "/:id",
  ...canManageProducts,
  updateProduct,
);
productRouter.delete("/:id", ...canManageProducts, deleteProduct);
// Comments
productRouter.post("/:productId/comments", TokenAuth, createComment);
productRouter.delete("/comments/:id", TokenAuth, deleteComment);
export default productRouter;
