import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT = `Read this receipt and return ONLY a JSON object with these fields:
{
  "store": string,
  "date": "YYYY-MM-DD" or null,
  "total": number,
  "currency": string,
  "gst": number or null,
  "total_savings": number or null,
  "offers": [strings describing each discount or offer applied],
  "points_earned": number or null,
  "points_balance": number or null,
  "loyalty_program": string or null,
  "items": [{"name": string, "price": number}]
}
Use null for anything not printed on the receipt. Do not guess or invent values.`;

app.post("/api/scan", async (req, res) => {
  const start = Date.now();
  console.log("Scan started, image size:", Math.round(req.body.image.length / 1024), "KB");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          parts: [
            { inlineData: { data: req.body.image, mimeType: "image/jpeg" } },
            { text: PROMPT },
          ],
        },
      ],
      config: { responseMimeType: "application/json" },
    });
    console.log("Gemini replied after", (Date.now() - start) / 1000, "seconds");
    res.json(JSON.parse(response.text));
  } catch (err) {
    console.log("Failed after", (Date.now() - start) / 1000, "seconds");
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Running at http://localhost:3000"));