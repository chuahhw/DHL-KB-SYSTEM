const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

router.post('/generate', auth, async (req, res) => {
  const { rawText, imageBase64, imageMime } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    let result;

    if (imageBase64) {
      result = await model.generateContent([
        { inlineData: { mimeType: imageMime, data: imageBase64 } },
        { text: `You are a DHL logistics knowledge base assistant.
Extract all text and information from this image and return ONLY valid JSON with no markdown, no backticks, just raw JSON:
{
  "title": "short descriptive title",
  "summary": "2-3 sentence summary",
  "steps": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"]
}` }
      ]);
    } else {
      result = await model.generateContent(
        `You are a DHL logistics knowledge base assistant. Transform the following raw content into a structured KB article.
Return ONLY valid JSON with no markdown, no backticks, just raw JSON:
{
  "title": "short descriptive title",
  "summary": "2-3 sentence summary",
  "steps": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"]
}

Raw content:
${rawText}`
      );
    }

    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // Check conflicts against ALL existing articles (not just published)
    const { data: existing } = await supabase
      .from('articles')
      .select('id, title, tags, summary, status');

    const newTags = (parsed.tags || []).map(t => t.toLowerCase());
    const newTitleWords = (parsed.title || '')
      .toLowerCase()
      .split(' ')
      .filter(w => w.length > 3);

    const conflicts = (existing || []).filter(a => {
      const existingTags = (a.tags || []).map(t => t.toLowerCase());
      const tagMatch = existingTags.some(t => newTags.includes(t));
      const titleMatch = newTitleWords.some(w =>
        (a.title || '').toLowerCase().includes(w)
      );
      return tagMatch || titleMatch;
    }).slice(0, 3);

    res.json({ ...parsed, conflicts });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/check-conflict — check conflict for an existing article
router.post('/check-conflict', auth, async (req, res) => {
  const { title, tags, articleId } = req.body;

  // Conflict check — only flag genuine conflicts
const { data: existing } = await supabase
  .from('articles')
  .select('id, title, tags, status');

const ignoreTags = [
  'dhl', 'operations', 'logistics', 'rpa-ingested', 'reference',
  'troubleshooting', 'procedure', 'process', 'guide', 'sop',
  'image', 'text', 'file', 'needs-review', 'ai-failed'
];

const newTags = (parsed.tags || [])
  .map(t => t.toLowerCase().trim())
  .filter(t => !ignoreTags.includes(t) && t.length > 4);

const newTitleWords = (parsed.title || '')
  .toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ')
  .split(' ')
  .filter(w => w.length > 5);

const conflicts = (existing || []).filter(a => {
  const existingTags = (a.tags || [])
    .map(t => t.toLowerCase().trim())
    .filter(t => !ignoreTags.includes(t) && t.length > 4);

  // Need 2+ matching meaningful tags
  const matchingTags = existingTags.filter(t => newTags.includes(t));
  const tagMatch = matchingTags.length >= 2;

  // Need 3+ matching significant title words
  const existingTitleWords = (a.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter(w => w.length > 5);
  const matchingWords = newTitleWords.filter(w => existingTitleWords.includes(w));
  const titleMatch = matchingWords.length >= 3;

  return tagMatch || titleMatch;
}).slice(0, 3);

res.json({ ...parsed, conflicts });
});

module.exports = router;