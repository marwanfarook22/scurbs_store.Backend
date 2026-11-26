import mongoose from "mongoose";
import Product from "../models/Product.js";
import ProductDetail from "../models/ProductDetail.js";

const productFields = [
  "name",
  "description",
  "material",
  "gender",
  "basePrice",
  "category",
  "isFeatured",
];

const getProductFields = (body = {}) =>
  Object.fromEntries(
    Object.entries(body).filter(([field]) => productFields.includes(field)),
  );

const parseProductFields = (body) => getProductFields(body);

export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(parseProductFields(req.body));
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find()
      .populate("category", "name slug")
      .populate("details")
      .sort({ createdAt: -1 });

    const data = products.map((product) => {
      const result = product.toObject();
      const details = result.details || [];
      const availableDetails = details.filter((detail) => detail.quantityOnHand > 0);
      const pricedDetails = availableDetails.length > 0 ? availableDetails : details;
      const prices = pricedDetails.map((detail) =>
        detail.salesPrice > 0 && detail.salesPrice < detail.price
          ? detail.salesPrice
          : detail.price,
      ).filter((price) => Number.isFinite(price));

      result.price = prices.length > 0 ? Math.min(...prices) : result.basePrice || 0;
      const salePrices = pricedDetails
        .filter((detail) => detail.salesPrice > 0 && detail.salesPrice < detail.price)
        .map((detail) => detail.salesPrice);
      result.salesPrice = salePrices.length > 0 ? Math.min(...salePrices) : 0;
      result.quantityOnHand = details.reduce(
        (total, detail) => total + (detail.quantityOnHand || 0),
        0,
      );
      return result;
    });

    res
      .status(200)
      .json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const product = await (
      mongoose.isValidObjectId(idOrSlug)
        ? Product.findById(idOrSlug)
        : Product.findOne({ slug: idOrSlug })
    )
      .populate("category", "name slug")
      .populate("details")
      .populate({
        path: "comments",
        options: { sort: { createdAt: -1 } }, // عرض أحدث التعليقات أولاً
        populate: {
          path: "user",
          select: "name profileImage",
        },
      });

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    Object.assign(product, parseProductFields(req.body));
    await product.save();

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    await ProductDetail.deleteMany({ product: product._id });

    res
      .status(200)
      .json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};
