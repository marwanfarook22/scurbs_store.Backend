import mongoose from "mongoose";
import Product from "../models/Product.js";
import ProductDetail from "../models/ProductDetail.js";
import { cloudinary } from "../config/cloudinary.js";

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const invalidField = (field) =>
  Object.assign(new Error(`Invalid ${field}`), { statusCode: 400 });

const normalizeNumber = (value, field) => {
  if (value === "" && field !== "price") return 0;
  const number = Number(value);
  if (!Number.isFinite(number)) throw invalidField(field);
  return number;
};

const normalizeImagesList = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    if (value.some((image) => typeof image !== "string")) {
      throw invalidField("imagesList");
    }
    return value.map((image) => image.trim()).filter(Boolean);
  }
  if (typeof value !== "string") throw invalidField("imagesList");

  const trimmedValue = value.trim();
  if (!trimmedValue) return [];
  if (trimmedValue.startsWith("[")) {
    let parsed;
    try {
      parsed = JSON.parse(trimmedValue);
    } catch {
      throw invalidField("imagesList");
    }
    if (!Array.isArray(parsed) || parsed.some((image) => typeof image !== "string")) {
      throw invalidField("imagesList");
    }
    return parsed.map((image) => image.trim()).filter(Boolean);
  }
  return trimmedValue.split(/[,\r\n]/).map((image) => image.trim()).filter(Boolean);
};

const normalizeDetail = (body = {}) => {
  const detail = {};
  if (hasOwn(body, "size")) {
    if (typeof body.size !== "string") throw invalidField("size");
    detail.size = body.size.trim().toUpperCase();
  }

  const colorName = hasOwn(body, "colorName") ? body.colorName : body.color?.name;
  const colorHex = hasOwn(body, "colorHex") ? body.colorHex : body.color?.hex;
  if (colorName !== undefined) {
    if (typeof colorName !== "string") throw invalidField("color.name");
    detail["color.name"] = colorName.trim();
  }
  if (colorHex !== undefined) {
    if (typeof colorHex !== "string") throw invalidField("color.hex");
    detail["color.hex"] = colorHex.trim();
  }

  for (const field of ["price", "salesPrice", "quantityOnHand"]) {
    if (hasOwn(body, field)) detail[field] = normalizeNumber(body[field], field);
  }
  if (hasOwn(body, "imagesList")) {
    detail.imagesList = normalizeImagesList(body.imagesList);
  }
  return detail;
};

const getUploadedImageUrls = (files = []) =>
  files.map((file) => file.path).filter(Boolean);

const removeUploadedImages = async (files = []) => {
  const cleanupResults = await Promise.allSettled(
    files
      .filter((file) => file.filename)
      .map((file) => cloudinary.uploader.destroy(file.filename)),
  );
  cleanupResults.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Failed to remove an unrecorded product image:", result.reason);
    }
  });
};

export const getProductDetails = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const details = await ProductDetail.find({ product: productId }).sort({ size: 1, "color.name": 1 });
    res.status(200).json({ success: true, data: details });
  } catch (error) {
    next(error);
  }
};

export const getProductDetailById = async (req, res, next) => {
  try {
    const detail = await ProductDetail.findById(req.params.detailId).populate(
      "product",
      "name slug imagesList",
    );
    if (!detail) {
      return res.status(404).json({ success: false, message: "Product detail not found" });
    }

    res.status(200).json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
};

export const createProductDetail = async (req, res, next) => {
  let detailSaved = false;
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) {
      await removeUploadedImages(req.files);
      return res.status(400).json({ success: false, message: "Invalid product ID" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      await removeUploadedImages(req.files);
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const normalized = normalizeDetail(req.body);
    const {
      "color.name": colorName,
      "color.hex": colorHex,
      ...detailFields
    } = normalized;
    const detail = await ProductDetail.create({
      product: productId,
      ...detailFields,
      imagesList: [
        ...(detailFields.imagesList || []),
        ...getUploadedImageUrls(req.files),
      ],
      color: {
        name: colorName,
        ...(colorHex !== undefined ? { hex: colorHex } : {}),
      },
    });

    detailSaved = true;
    res.status(201).json({ success: true, data: detail });
  } catch (error) {
    if (!detailSaved) await removeUploadedImages(req.files);
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This size and color already exist for the product",
      });
    }
    if (error?.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const updateProductDetail = async (req, res, next) => {
  let detailSaved = false;
  try {
    const detail = await ProductDetail.findById(req.params.detailId);
    if (!detail) {
      await removeUploadedImages(req.files);
      return res.status(404).json({ success: false, message: "Product detail not found" });
    }

    const normalized = normalizeDetail(req.body);
    for (const [field, value] of Object.entries(normalized)) {
      detail.set(field, value);
    }
    if (req.files?.length) {
      detail.imagesList = [
        ...(detail.imagesList || []),
        ...getUploadedImageUrls(req.files),
      ];
    }
    await detail.save();
    detailSaved = true;
    res.status(200).json({ success: true, data: detail });
  } catch (error) {
    if (!detailSaved) await removeUploadedImages(req.files);
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This size and color already exist for the product",
      });
    }
    if (error?.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const deleteProductDetail = async (req, res, next) => {
  try {
    const detail = await ProductDetail.findByIdAndDelete(req.params.detailId);
    if (!detail) {
      return res.status(404).json({ success: false, message: "Product detail not found" });
    }
    res.status(200).json({ success: true, message: "Product detail deleted successfully" });
  } catch (error) {
    next(error);
  }
};
