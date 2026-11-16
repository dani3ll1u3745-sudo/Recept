import express from "express";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROMPT = `Read this receipt and return ONLY a JSON object with these fields:
{
  "store": string (the brand name only, with no branch, suburb, address or store number),
  "date": "YYYY-MM-DD" or null,
  "total": number,
  "currency": string,
  "gst": number or null,
  "total_savings": number or null,
  "offers": [strings describing each discount or offer applied],
  "points_earned": number or null,
  "points_balance": number or null,
  "loyalty_program": "Flybuys" or "Everyday Rewards" or null,
  "items": [{"name": string, "price": number}]
}
Rules: Use null for anything not printed on the receipt. Do not guess or invent values. Only include in items the purchased products that have a price; ignore promotional text, slogans and description lines that have no price of their own. Set loyalty_program to "Flybuys" only if the receipt clearly shows Flybuys, or to "Everyday Rewards" only if it clearly shows Everyday Rewards (Woolworths); otherwise use null. If loyalty_program is null, points_earned and points_balance must also be null.`;

// Only let signed-in users through
async function requireUser(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Please sign in." });

  const { data, error } = await supa.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "Please sign in again." });

  const allowed = process.env.ALLOWED_EMAIL;
  if (allowed && (data.user.email || "").toLowerCase() !== allowed.toLowerCase()) {
    return res.status(403).json({ error: "This account is not allowed." });
  }
  req.user = data.user;
  next();
}

app.post("/api/scan", requireUser, async (req, res) => {
  const image = req.body && req.body.image;
  if (typeof image !== "string" || image.length < 100) {
    return res.status(400).json({ error: "No image received." });
  }
  const start = Date.now();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          parts: [
            { inlineData: { data: image, mimeType: "image/jpeg" } },
            { text: PROMPT },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });
    console.log("Scan done in", (Date.now() - start) / 1000, "seconds");
    res.json(JSON.parse(response.text));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Running at http://localhost:" + port));