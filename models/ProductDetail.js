import mongoose from "mongoose";

const productDetailSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    size: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    color: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      hex: {
        type: String,
        trim: true,
      },
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    salesPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantityOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    imagesList: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  { timestamps: true },
);

productDetailSchema.index(
  { product: 1, size: 1, "color.name": 1 },
  { unique: true },
);

const ProductDetail = mongoose.model("ProductDetail", productDetailSchema);
export default ProductDetail;
