import InstagramPost from "../models/InstagramPost.js";
import { cloudinary } from "../config/cloudinary.js";

const instagramPostPattern =
  /^https?:\/\/(?:www\.)?instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?(?:\?.*)?$/i;

export const getInstagramPosts = async (req, res, next) => {
  try {
    const posts = await InstagramPost.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: posts.length, data: posts });
  } catch (error) {
    next(error);
  }
};

export const createInstagramPost = async (req, res, next) => {
  if (req.file) {
    try {
      const post = await InstagramPost.create({
        mediaType: "image",
        url: req.file.path,
        publicId: req.file.filename,
      });
      return res.status(201).json({ success: true, data: post });
    } catch (error) {
      try {
        await cloudinary.uploader.destroy(req.file.filename);
      } catch (cleanupError) {
        console.error("Failed to remove an unrecorded scroll-snap image:", cleanupError);
      }

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This image has already been added.",
        });
      }
      return next(error);
    }
  }

  const submittedUrl = req.body?.url;
  const match =
    typeof submittedUrl === "string" &&
    instagramPostPattern.exec(submittedUrl.trim());

  if (!match) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid Instagram post, reel, or IGTV URL.",
    });
  }

  const postType = match[1].toLowerCase();
  const shortcode = match[2];
  const url = `https://www.instagram.com/${postType}/${shortcode}/`;

  try {
    const post = await InstagramPost.create({ url, postType, shortcode });
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This Instagram post has already been added.",
      });
    }
    next(error);
  }
};

export const deleteInstagramPost = async (req, res, next) => {
  try {
    const post = await InstagramPost.findById(req.params.id);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Instagram post not found." });
    }

    if (post.mediaType === "image" && post.publicId) {
      await cloudinary.uploader.destroy(post.publicId);
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      message: "Instagram post deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
