import mongoose from "mongoose";
import slugify from "slugify";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    material: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Men", "Women", "Unisex"],
      default: "Unisex",
    },
    basePrice: {
      type: Number,
      min: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    averageRating: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    sold: {
      type: Number,
      default: 0,
    },
    // تم إزالة حقل comments من هنا نهائياً
  },
  {
    timestamps: true,
    // تفعيل الحقول الافتراضية (Virtuals) لتظهر في الـ JSON عند جلب المنتج
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ربط افتراضي (Virtual Populate) لجلب التعليقات المرتبطة بهذا المنتج من جدول Comment
productSchema.virtual("comments", {
  ref: "Comment",
  foreignField: "product", // اسم الحقل في جدول Comment
  localField: "_id", // اسم الحقل في جدول Product
});

productSchema.virtual("details", {
  ref: "ProductDetail",
  foreignField: "product",
  localField: "_id",
});

// احذف (next) من القوسين، واحذف سطر next() من الداخل
productSchema.pre("save", async function () {
  if (this.isModified("name")) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

const Product = mongoose.model("Product", productSchema);
export default Product;
