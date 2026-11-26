import mongoose from "mongoose";

const instagramPostSchema = new mongoose.Schema(
  {
    mediaType: {
      type: String,
      enum: ["instagram", "image"],
      default: "instagram",
    },
    url: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    postType: {
      type: String,
      enum: ["p", "reel", "tv"],
    },
    shortcode: {
      type: String,
      required: false,
      trim: true,
    },
    publicId: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

const InstagramPost = mongoose.model("InstagramPost", instagramPostSchema);

export default InstagramPost;
