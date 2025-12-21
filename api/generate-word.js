/*export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  }

  const { theme } = req.body

  if (!theme) {
    return res.status(400).json({ error: 'THEME_REQUIRED' })
  }

  return res.status(200).json({
    citizenWord: 'カレー',
    wolfWord: 'シチュー'
  })
}*/
const FALLBACK_PAIRS = [
  { citizenWord: "りんご", wolfWord: "みかん" },
  { citizenWord: "犬", wolfWord: "猫" },
  { citizenWord: "夏", wolfWord: "冬" },
  { citizenWord: "山", wolfWord: "海" },
  { citizenWord: "コーヒー", wolfWord: "紅茶" },
  { citizenWord: "野球", wolfWord: "サッカー" },
  { citizenWord: "電車", wolfWord: "バス" },
  { citizenWord: "ラーメン", wolfWord: "うどん" },
  { citizenWord: "映画", wolfWord: "ドラマ" },
  { citizenWord: "東京", wolfWord: "大阪" }
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json(getRandomFallback());
  }

  const { theme } = req.body;

  if (!theme || typeof theme !== 'string' || theme.trim() === '' || theme.length > 20) {
    return res.status(200).json(getRandomFallback());
  }

  try {
    const prompt = `あなたはワードウルフ用の単語生成AIです。
以下の条件を厳守してください。
・テーマに沿った名詞を2つ生成する
・1つ目は市民用、2つ目はウルフ用
・同一ジャンルだが明確に異なる単語
・日本語のみ
・出力はJSONのみ
出力形式：
{
"citizenWord": "",
"wolfWord": ""
}
テーマ：${theme}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      return res.status(200).json(getRandomFallback());
    }

    const text = data.content[0].text.trim();
    let parsed;

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(200).json(getRandomFallback());
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return res.status(200).json(getRandomFallback());
    }

    if (!parsed.citizenWord || !parsed.wolfWord || 
        typeof parsed.citizenWord !== 'string' || 
        typeof parsed.wolfWord !== 'string' ||
        parsed.citizenWord === parsed.wolfWord) {
      return res.status(200).json(getRandomFallback());
    }

    return res.status(200).json({
      citizenWord: parsed.citizenWord,
      wolfWord: parsed.wolfWord
    });

  } catch (error) {
    return res.status(200).json(getRandomFallback());
  }
}

function getRandomFallback() {
  const randomIndex = Math.floor(Math.random() * FALLBACK_PAIRS.length);
  return FALLBACK_PAIRS[randomIndex];
}
