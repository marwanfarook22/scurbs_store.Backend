import mongoose from "mongoose";
import Category from "../models/categories.js";

export const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create({ name: req.body?.name });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res
      .status(200)
      .json({ success: true, count: categories.length, data: categories });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const category = await (mongoose.isValidObjectId(idOrSlug)
      ? Category.findById(idOrSlug)
      : Category.findOne({ slug: idOrSlug }));

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    if (Object.hasOwn(req.body ?? {}, "name")) {
      category.name = req.body.name;
    }
    await category.save();

    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};
