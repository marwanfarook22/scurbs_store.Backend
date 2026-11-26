import mongoose from "mongoose";
import Product from "./Product.js";

const commentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Comment must belong to a user"],
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Comment must belong to a product"],
    },
  },
  { timestamps: true },
);

// دالة ثابتة (Static Method) لحساب متوسط التقييمات وتحديث المنتج تلقائياً
commentSchema.statics.calcAverageRatings = async function (productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId },
    },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      // تقريب المتوسط لأقرب رقم عشري واحد (مثل 4.5)
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
    });
  } else {
    // إذا تم حذف جميع التعليقات يعود التقييم إلى 0
    await Product.findByIdAndUpdate(productId, {
      averageRating: 0,
    });
  }
};

commentSchema.post("save", async function () {
  await this.constructor.calcAverageRatings(this.product);
});

commentSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.product);
  }
});

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
