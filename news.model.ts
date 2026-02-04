import mongoose from "mongoose";

export const NewsSchema = new mongoose.Schema(
  {
    articleId: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    thumbnail: { type: String, required: true },
    title: { type: String, required: true },
    summary: { type: String, default: "" },
    link: { type: String, required: true },
  },
  { timestamps: true }
);

export const News = mongoose.model("news", NewsSchema);
