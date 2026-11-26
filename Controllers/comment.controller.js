import Comment from "../models/Comment.js";
import Product from "../models/Product.js";

// 1. إضافة تعليق وتقييم على منتج (للمستخدم المسجل)
export const createComment = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { text, rating } = req.body;

    const productExists = await Product.findById(productId);
    if (!productExists) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const comment = await Comment.create({
      text,
      rating: Number(rating),
      user: req.user._id, // قادم من TokenAuth middleware
      product: productId,
    });

    // جلب بيانات المستخدم لإرجاعها للفرونت إند فوراً
    await comment.populate("user", "name profileImage");

    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

// 2. حذف تعليق (لصاحب التعليق أو الأدمن)
export const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res
        .status(404)
        .json({ success: false, message: "Comment not found" });
    }

    // السماح بالحذف لصاحب التعليق أو للأدمن والموديريتور
    const isOwner = comment.user.toString() === req.user._id.toString();
    const isStaff = ["admin", "moderator"].includes(req.user.role);

    if (!isOwner && !isStaff) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Not authorized to delete this comment",
        });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res
      .status(200)
      .json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    next(error);
  }
};
