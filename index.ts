import dotenv from "dotenv";
import request from "./configs/request";
import * as cheerio from "cheerio";
import TelegramBot from "node-telegram-bot-api";
import { GoogleGenAI } from "@google/genai";
import express from "express";
import mongoose from "mongoose";
import { News } from "./news.model";

dotenv.config({
  path: [".env.local", ".env"],
});

const app = express();

const connectDB = async () => {
  mongoose
    .connect(process.env.MONGODB_URI!)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((error) => {
      console.error("🚀 ~ db ~ error:", error);
    });
};

// constant
const CATEGORIES = [
  "the-thao",
  "cong-nghe",
  "suc-khoe",
  "doi-song",
  "giai-tri",
  "du-lich",
  "lifestyle",
  "thoi-su",
  "the-gioi",
];

const THREAD_ID = {
  "the-thao": 23,
  "cong-nghe": 21,
  "thoi-su": 19,
  "the-gioi": 17,
  "giai-tri": 15,
  "suc-khoe": 13,
  "doi-song": 11,
  "du-lich": 9,
  lifestyle: 7,
};

// dev
// const CATEGORIES = ["the-thao", "cong-nghe"];

// const THREAD_ID = {
//   "the-thao": 2,
//   "cong-nghe": 18,
// };

const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SOURCE_DOMAIN = process.env.CRON_SOURCE_DOMAIN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;

const telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN!, {});
const gemini = new GoogleGenAI({
  apiKey: GEMINI_API_KEY!,
});

const sendMessage = async (
  photo: string,
  caption: string,
  link: string,
  category: string,
) => {
  try {
    const threadId = THREAD_ID[category as keyof typeof THREAD_ID];
    await telegramBot.sendPhoto(TELEGRAM_CHAT_ID!, photo, {
      caption,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Xem thêm",
              url: link,
            },
          ],
        ],
      },
      message_thread_id: threadId,
    });
  } catch (error: any) {
    console.error("🚀 ~ sendMessage ~ error:", error.message);
    return null;
  }
};

const generateSummary = async (link: string) => {
  try {
    const content = await fetchDetail(link);
    let prompt = `Bạn là trợ lý tóm tắt nội dung báo chí.

Nhiệm vụ của bạn là đọc một chuỗi RAW HTML của một trang báo và tự động trích xuất nội dung bài viết chính. Hãy bỏ qua toàn bộ phần không liên quan như script, style, quảng cáo, menu, footer, bình luận và nội dung gợi ý.

Sau khi hiểu nội dung, hãy viết một đoạn tóm tắt ngắn gọn, mạch lạc, trung lập, phản ánh đúng ý chính của bài báo, bao gồm bối cảnh, vấn đề chính và kết luận hoặc tác động nếu có.

Chỉ sử dụng thông tin xuất hiện trong HTML, không suy đoán hay bổ sung kiến thức bên ngoài. Không sao chép nguyên văn dài từ bài gốc.

Độ dài kết quả không vượt quá 1024 ký tự và chỉ trả về văn bản thuần, không tiêu đề, không gạch đầu dòng, không định dạng đặc biệt.

Dữ liệu đầu vào là nội dung RAW HTML sau:

${content}`;
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL!,
      contents: prompt,
      config: {},
    });
    return response.text;
  } catch (error) {
    console.error("🚀 ~ generateSummary ~ error:", error);
    return null;
  }
};

const fetchDetail = async (link: string) => {
  try {
    const response: string = await request.get(link);
    const $ = cheerio.load(response);
    // Clone article body and remove unwanted sections (if they exist)
    const $articleBody = $(".the-article-body").clone();
    $articleBody.find(".notebox").remove();
    $articleBody.find("#innerarticle").remove();

    const content =
      $articleBody.text().trim() ||
      $(".the-article-body").text().trim() ||
      $("body").text().trim();
    return content;
  } catch (error) {
    console.error("🚀 ~ fetchDetail ~ error:", error);
    return null;
  }
};

const scrapContent = async (category: string) => {
  const response: string = await request.get(
    CRON_SOURCE_DOMAIN! + `/${category}.html`,
  );
  const $ = cheerio.load(response);
  const newsList = $("#news-latest .article-list .article-item");

  const newsListData = newsList
    .get()
    .reverse()
    .map((element) => {
      const $element = $(element);
      return {
        articleId: $element.attr("article-id"),
        thumbnail: $element
          .find(".article-thumbnail img")
          .attr("data-src")
          ?.trim(),
        title: $element.find(".article-title").text().trim(),
        link: $element.find(".article-thumbnail a").attr("href")?.trim(),
        category,
      };
    });
  const articleIds = newsListData
    .map((item) => item.articleId)
    .filter((id): id is string => Boolean(id));

  const existing = await News.find({ articleId: { $in: articleIds } })
    .select("articleId")
    .lean();
  const existingIds = new Set(existing.map((item) => item.articleId));

  const newNews = newsListData.filter(
    (item) => item.articleId && !existingIds.has(item.articleId),
  );

  if (newNews.length === 0) return;

  // Insert only unseen articles; ignore duplicates by pre-filtering
  await News.insertMany(newNews, { ordered: false })
    .then(() => {
      console.log(`Insert ${newNews.length} news to ${category} success!`);
    })
    .catch((error) => {
      console.error(
        `Insert ${newNews.length} news to ${category} error:`,
        error,
      );
    });
};

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/scrap", async (req, res) => {
  await connectDB();
  Promise.all(
    CATEGORIES.map(async (category) => {
      await scrapContent(category)
        .then(() => {
          console.log(`Scrap content ${category} success!`);
        })
        .catch((error) => {
          console.error(`Scrap content ${category} error:`, error);
        });
    }),
  );
  res.send("Scrap content success!");
});

app.get("/summarize", async (req, res) => {
  try {
    // Find the oldest news item that still doesn't have a real summary
    await connectDB();
    const news = await News.findOne({
      $or: [
        { summary: { $exists: false } },
        { summary: null },
        { summary: "" },
        { summary: { $regex: /^none$/i } },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    if (!news) {
      res.status(404).json({
        message: "No news found with missing summary.",
      });
      return;
    }

    const summary = await generateSummary(news.link!);
    if (!summary) {
      await connectDB();
      await News.updateOne(
        { articleId: news.articleId },
        { $set: { summary: "Failed to summary!" } },
      );
      res.status(500).json({
        message: "Summary failed!",
      });
    }

    await News.updateOne(
      { articleId: news.articleId },
      { $set: { summary: summary } },
    );
    res.json({
      message: "Summary generated successfully",
      summary,
    });
    await sendMessage(
      news.thumbnail!,
      `<strong>${news.title}</strong>\n${summary ?? news.summary.trim()}`,
      news.link!,
      news.category,
    );
    return;
  } catch (error) {
    console.error("🚀 ~ /summarize ~ error:", error);
    res.status(500).json({ message: "Internal Server Error" });
    return;
  }
});

app.listen(process.env.PORT || 4060, () => {
  console.log(`Server is running on port ${process.env.PORT || 4060}`);
});
