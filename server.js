// server.js
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

// ------------------- Middlewares -------------------

// Security headers
app.use(helmet());

// Parse JSON requests
app.use(express.json());

// Allow only your frontend
app.use(cors({
  origin: "https://vinayak2024.netlify.app" // <-- Replace with your frontend URL
}));

// Rate limiter: 50 requests per minute per IP
app.use(rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
}));

// ------------------- Helper functions -------------------

// OpenRouter API key
const OPENROUTER_API_KEY = process.env.GENERAL_MODEL;

// Read system prompt
function getSystemPrompt() {
  try {
    return fs.readFileSync(path.join("prompt.txt"), "utf-8");
  } catch (err) {
    console.error("Error reading prompt.txt:", err);
    return "You are a helpful AI assistant.";
  }
}

// ------------------- Routes -------------------

// Health check
app.get("/", (req, res) => res.send("✅ Server running!"));

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

// ------------------- Start server -------------------
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
