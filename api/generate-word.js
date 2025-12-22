/*export const runtime = 'nodejs';

export default async function handler(req, res) {
  console.log('Function called');
  console.log('API KEY exists:', !!process.env.ANTHROPIC_API_KEY);

  res.status(200).json({ ok: true });
}*/

import fetch from "node-fetch";

console.log('GEMINI KEY exists:', !!process.env.GEMINI_API_KEY);

/**
 * キャッシュ（theme単位・メモリ）
 * ※ Serverlessの特性上、リクエスト間で消える可能性あり
 */
const wordCache = new Map();

/**
 * フォールバックワード（10組）
 */
const FALLBACK_WORDS = [
  { citizenWord: "りんご", wolfWord: "みかん" },
  { citizenWord: "犬", wolfWord: "猫" },
  { citizenWord: "コーヒー", wolfWord: "紅茶" },
  { citizenWord: "野球", wolfWord: "サッカー" },
  { citizenWord: "夏", wolfWord: "冬" },
  { citizenWord: "電車", wolfWord: "バス" },
  { citizenWord: "ラーメン", wolfWord: "うどん" },
  { citizenWord: "山", wolfWord: "海" },
  { citizenWord: "ピアノ", wolfWord: "ギター" },
  { citizenWord: "映画", wolfWord: "ドラマ" }
];

const FORBIDDEN_WORDS = new Set(
  FALLBACK_WORDS.flatMap(w => [w.citizenWord, w.wolfWord])
);

/**
 * 入力チェック
 */


function isValidTheme(theme) {
  if (!theme || typeof theme !== "string") return false;
  if (theme.trim().length === 0) return false;
  if (theme.length > 20) return false;
  return true;
}

/**
 * フォールバック取得
 */
function getFallback() {
  return FALLBACK_WORDS[Math.floor(Math.random() * FALLBACK_WORDS.length)];
}

/**
 * キャッシュ取得（取得後削除）
 */
async function generateWithAI(theme) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `
あなたはワードウルフ用の単語生成AIです。
以下の条件を厳守してください。

・テーマに沿った名詞の単語ペアを10組生成する
・citizenWord と wolfWord を持つ
・同一ジャンルだが明確に異なる単語
・同じ単語ペアを生成しない
・日本語のみ
・出力はJSONのみ

出力形式：
{
  "words": [
    { "citizenWord": "string", "wolfWord": "string" }
  ]
}

テーマ：${theme}
`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: prompt }] }
          ]
        })
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) return null;

    const jsonText = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonText);

    if (!Array.isArray(parsed.words) || parsed.words.length !== 10) {
      return null;
    }

    return parsed.words;
  } catch {
    return null;
  }
}

/**
 * Vercel Handler
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json(getFallback());
  }

  const { theme } = req.body;

  if (!isValidTheme(theme)) {
    return res.status(200).json(getFallback());
  }

  const normalizedTheme = theme.trim();

  const cached = getFromCache(normalizedTheme);
  if (cached) {
    return res.status(200).json(cached);
  }

  const words = await generateWithAI(normalizedTheme);
  if (!words) {
    return res.status(200).json(getFallback());
  }

  wordCache.set(normalizedTheme, [...words]);

  const word = getFromCache(normalizedTheme);
  return res.status(200).json(word);
}



