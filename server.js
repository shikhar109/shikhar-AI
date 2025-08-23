import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

// Rate limiter
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50,
});
app.use(limiter);

// OpenRouter key
const OPENROUTER_API_KEY = process.env.GENERAL_MODEL;

// Read prompt file
function getSystemPrompt() {
  try {
    const prompt = fs.readFileSync("prompt.txt", "utf-8");
    return prompt;
  } catch (err) {
    console.error("Error reading prompt.txt:", err);
    return "You are a helpful AI assistant.";
  }
}

// Chat endpoint
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  const systemPrompt = getSystemPrompt();

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter API error:", errText);
      return res.status(500).json({ error: "Failed to get response from AI" });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "No response";
    res.json({ reply: aiMessage });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Serve React frontend
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
