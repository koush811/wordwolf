export default async function handler(req, res) {
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
}
