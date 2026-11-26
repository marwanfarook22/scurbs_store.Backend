import mongoose from "mongoose";
import slugify from "slugify";

const categoriesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "categories name is required"],
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

categoriesSchema.pre("validate", function () {
  if (this.name && (this.isModified("name") || !this.slug)) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

const Category = mongoose.model("Category", categoriesSchema);

export default Category;
