import 'dotenv/config';
import fetch from "node-fetch";

// キャッシュ（テーマ単位・メモリ）
const wordCache = new Map();

// 入力チェック
function isValidTheme(theme) {
  return (
    theme &&
    typeof theme === "string" &&
    theme.trim().length > 0 &&
    theme.length <= 20
  );
}

// キャッシュ取得（取得後削除）
function getFromCache(theme) {
  const cached = wordCache.get(theme);
  if (!cached || cached.length === 0) return null;
  return cached.shift();
}

// AI生成
async function generateWithAI(theme) {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log("=== generateWithAI called ===");
  console.log("Theme:", theme);
  console.log("API Key exists:", !!apiKey);

  if (!apiKey) {
    throw new Error("APIキーが設定されていません");
  }

  const prompt = `
あなたはワードウルフ用の単語生成AIです。

【条件】
・テーマに沿った名詞の単語ペアを10組生成
・citizenWord と wolfWord の両方に必ず単語を入れる
・同ジャンルだが意味が異なる
・日本語のみ
・JSONのみで出力
・説明文は禁止

【出力形式】
{
  "words": [
    { "citizenWord": "", "wolfWord": "" }
  ]
}

テーマ：${theme}
`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini API error:", errText);
    throw new Error("Gemini APIエラー");
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("AIレスポンスが空です");
  }

  const jsonText = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(jsonText);

  if (!Array.isArray(parsed.words) || parsed.words.length !== 10) {
    throw new Error("AIの出力形式が不正です");
  }

  return parsed.words;
}

// Vercel Handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { theme } = req.body;
  if (!isValidTheme(theme)) {
    return res.status(400).json({ error: "Invalid theme" });
  }

  const normalizedTheme = theme.trim();

  // キャッシュがあれば返す
  const cached = getFromCache(normalizedTheme);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const words = await generateWithAI(normalizedTheme);

    // キャッシュ保存
    wordCache.set(normalizedTheme, [...words]);

    const word = getFromCache(normalizedTheme);
    return res.status(200).json(word);

  } catch (err) {
    console.error(" Word generation failed:", err.message);
    return res.status(500).json({
      error: "単語生成に失敗しました"
    });
  }
}
