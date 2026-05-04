const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Sanitize any string to be safe for JSON parsing
function sanitizeForJson(str) {
  if (!str) return '';
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // Only keep printable ASCII + common whitespace
    if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) {
      result += str[i];
    } else {
      result += ' '; // replace anything else with space
    }
  }
  return result
    .replace(/\\/g, ' ')     // remove backslashes
    .replace(/"/g, "'")      // replace double quotes
    .replace(/\t/g, ' ')     // tabs to spaces
    .replace(/\r\n/g, ' ')   // CRLF to space
    .replace(/\r/g, ' ')     // CR to space
    .replace(/\n/g, ' ')     // LF to space
    .replace(/\s+/g, ' ')    // collapse multiple spaces
    .trim();
}

const rpaAuth = (req, res, next) => {
  if (req.headers['x-rpa-key'] !== process.env.RPA_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

// ── Helper: call Gemini to structure raw text ──────────────────────────────
async function generateArticleContent(rawText, fileName) {
  const cleanText = rawText
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`[GEMINI] File: ${fileName}, text length: ${cleanText.length}`);

  if (cleanText.length < 10) {
    return buildFallback(rawText, fileName);
  }

  const prompt = `You are a DHL logistics knowledge base assistant.
Transform the following raw content into a structured KB article.
You MUST always return valid steps — minimum 3, maximum 8.
If the content is about an error or problem, steps = how to troubleshoot/fix it.
If the content is about a process, steps = how to perform it.
If the content is about onboarding, steps = the onboarding procedure.

Return ONLY this exact JSON structure, no markdown, no extra text:
{
  "title": "concise descriptive title",
  "summary": "2-3 sentences describing what this is about",
  "steps": ["First step here", "Second step here", "Third step here"],
  "tags": ["relevant-tag-1", "relevant-tag-2"]
}

File name: ${fileName}
Content: ${cleanText.substring(0, 8000)}`;

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`[GEMINI] Attempt ${attempt} for: ${fileName}`);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonStart = clean.indexOf('{');
      const jsonEnd = clean.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        clean = clean.substring(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(clean);
      if (!parsed.title) parsed.title = fileName.replace(/\.[^/.]+$/, '');
      if (!parsed.summary) parsed.summary = `Knowledge base article for ${fileName}`;
      if (!parsed.steps || parsed.steps.length === 0) {
        parsed.steps = buildStepsFromText(cleanText);
      }
      if (!parsed.tags || parsed.tags.length === 0) parsed.tags = ['dhl', 'operations'];

      console.log(`[GEMINI] Success for ${fileName} — ${parsed.steps.length} steps`);
      return parsed;

    } catch (err) {
      // Extract retry delay from Gemini error
      let waitMs = 65000; // default 65 seconds

      try {
        const errorDetails = err.errorDetails || [];
        const retryInfo = errorDetails.find(d => d['@type']?.includes('RetryInfo'));
        if (retryInfo && retryInfo.retryDelay) {
          const seconds = parseInt(retryInfo.retryDelay.replace('s', ''));
          waitMs = (seconds + 5) * 1000; // add 5s buffer
        }
      } catch {}

      if (err.status === 429) {
        console.log(`[GEMINI] Rate limited. Waiting ${waitMs/1000}s before attempt ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        console.error(`[GEMINI] Non-429 error for ${fileName}:`, err.message);
        break; // don't retry non-rate-limit errors
      }
    }
  }

  // All attempts failed — build smart fallback from raw text
  console.log(`[GEMINI] Using smart fallback for: ${fileName}`);
  return buildFallback(cleanText, fileName);
}

// Build steps directly from raw text without AI
function buildStepsFromText(text) {
  // Try to extract bullet points or numbered items
  const lines = text.split(/[\n.!?]/).map(l => l.trim()).filter(l => l.length > 15);

  if (lines.length >= 3) {
    return lines.slice(0, 6).map(l => l.replace(/^[-•*\d.]+\s*/, '').trim());
  }

  // Split by comma or dash if no line breaks
  const parts = text.split(/[,\-]/).map(p => p.trim()).filter(p => p.length > 10);
  if (parts.length >= 3) return parts.slice(0, 5);

  return [
    'Review the content of this document',
    'Identify the key issue or procedure described',
    'Follow up with the relevant DHL team for resolution'
  ];
}

// Smart fallback — still builds meaningful content from raw text
function buildFallback(rawText, fileName) {
  const name = fileName.replace(/\.[^/.]+$/, '').replace(/[_\-]/g, ' ');
  const steps = buildStepsFromText(rawText);

  // Detect type from filename/content
  const isError = /error|fail|issue|problem|invalid|not working/i.test(fileName + rawText);
  const isProcess = /steps|process|procedure|how to|setup|onboard/i.test(fileName + rawText);

  let summary = '';
  if (isError) {
    summary = `This article documents the "${name}" issue reported in DHL operations. Follow the steps below to troubleshoot and resolve this error.`;
  } else if (isProcess) {
    summary = `This article outlines the procedure for "${name}" in DHL logistics operations. Follow the steps below to complete this process correctly.`;
  } else {
    summary = `This article covers "${name}" as part of DHL logistics operations knowledge base. Review the steps below for guidance.`;
  }

  return {
    title: name,
    summary,
    steps,
    tags: ['dhl', 'operations', isError ? 'troubleshooting' : isProcess ? 'procedure' : 'reference']
  };
}

// ── Helper: call Gemini Vision for images ─────────────────────────────────
async function generateFromImage(base64Content, fileName) {
  const ext = fileName.toLowerCase().split('.').pop();
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
  const imageMime = mimeMap[ext] || 'image/jpeg';

  let cleanBase64 = base64Content.includes(',') ? base64Content.split(',')[1] : base64Content;
  cleanBase64 = cleanBase64.replace(/\s/g, '');

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      console.log(`[GEMINI VISION] Attempt ${attempt} for: ${fileName}`);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent([
        { inlineData: { mimeType: imageMime, data: cleanBase64 } },
        { text: `You are a DHL logistics knowledge base assistant.
Look at this image. It may show chat messages, error screens, or process info.
Extract all visible text and create a KB article.
Return ONLY valid JSON, no markdown:
{
  "title": "descriptive title",
  "summary": "2-3 sentence description",
  "steps": ["step 1", "step 2", "step 3"],
  "tags": ["tag1", "tag2"]
}` }
      ]);

      const text = result.response.text().trim();
      let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonStart = clean.indexOf('{');
      const jsonEnd = clean.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) clean = clean.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(clean);

      if (!parsed.steps || parsed.steps.length === 0) {
        parsed.steps = [
          'Review the image content carefully',
          'Identify the issue or information shown',
          'Take appropriate action based on image content'
        ];
      }
      console.log(`[GEMINI VISION] Success for ${fileName}`);
      return parsed;

    } catch (err) {
      let waitMs = 65000;
      try {
        const retryInfo = (err.errorDetails || []).find(d => d['@type']?.includes('RetryInfo'));
        if (retryInfo?.retryDelay) {
          waitMs = (parseInt(retryInfo.retryDelay.replace('s', '')) + 5) * 1000;
        }
      } catch {}

      if (err.status === 429) {
        console.log(`[GEMINI VISION] Rate limited. Waiting ${waitMs/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } else {
        console.error(`[GEMINI VISION] Error:`, err.message);
        break;
      }
    }
  }

  // Fallback for image
  return {
    title: `[Image] ${fileName.replace(/\.[^/.]+$/, '')}`,
    summary: `Image file captured from DHL operations communication. Contains visual information that requires manual review and knowledge base documentation.`,
    steps: [
      'Open and review the image file from Google Drive',
      'Extract key information visible in the image',
      'Document the process or issue shown in the image',
      'Update this article with the extracted information'
    ],
    tags: ['image', 'dhl', 'operations', 'review-needed']
  };
}

// ── Helper: conflict check ────────────────────────────────────────────────
async function checkConflicts(title, tags, currentArticleId) {
  const { data: existing } = await supabase
    .from('articles')
    .select('id, title, tags, status');

  // Tags that should never trigger conflicts
  const ignoreTags = [
    'rpa-ingested', 'file', 'text', 'image', 'review-needed',
    'google_drive', 'dhl', 'operations', 'reference',
    'troubleshooting', 'procedure', 'ai-failed', 'needs-review'
  ];

  const meaningfulNewTags = (tags || [])
    .map(t => t.toLowerCase().trim())
    .filter(t => !ignoreTags.includes(t) && t.length > 3);

  // Need at least 4 words longer than 4 chars to do title matching
  const newTitleWords = (title || '')
    .toLowerCase()
    .replace(/[\[\]()_\-\.]/g, ' ')
    .split(' ')
    .filter(w => w.length > 4);

  // Skip conflict check if not enough meaningful data
  if (meaningfulNewTags.length === 0 && newTitleWords.length < 3) {
    return [];
  }

  const conflicts = (existing || []).filter(a => {
    if (a.id === currentArticleId) return false;

    const existingMeaningfulTags = (a.tags || [])
      .map(t => t.toLowerCase().trim())
      .filter(t => !ignoreTags.includes(t) && t.length > 3);

    // Tags must have 2+ matching meaningful tags
    const matchingTags = existingMeaningfulTags.filter(t => meaningfulNewTags.includes(t));
    const tagMatch = matchingTags.length >= 2;

    // Title must have 3+ matching significant words
    const existingTitleWords = (a.title || '')
      .toLowerCase()
      .replace(/[\[\]()_\-\.]/g, ' ')
      .split(' ')
      .filter(w => w.length > 4);
    const matchingWords = newTitleWords.filter(w => existingTitleWords.includes(w));
    const titleMatch = matchingWords.length >= 3;

    return tagMatch || titleMatch;
  });

  return conflicts.slice(0, 3);
}

// ── POST /api/rpa/ingest ──────────────────────────────────────────────────
router.post('/ingest', rpaAuth, async (req, res) => {
  const { fileName, fileContent, mimeType, encoding, source } = req.body;

  if (!fileName || !fileContent) {
    return res.status(400).json({ error: 'fileName and fileContent are required' });
  }

  try {
    const isImage = mimeType && mimeType.startsWith('image/');
    const isDocx = mimeType && mimeType.includes('wordprocessingml');
    const isText = mimeType && mimeType.startsWith('text/');

    // ── Decode content ──────────────────────────────────────────────────
    let decodedText = '';
    let imageBase64 = null;

    if (encoding === 'base64') {
    if (isImage) {
        imageBase64 = fileContent;
        decodedText = `[Image file: ${fileName}]`;
    } else {
        try {
        const buffer = Buffer.from(fileContent, 'base64');

        if (isDocx) {
            // Extract only printable ASCII from DOCX binary
            let raw = '';
            for (let i = 0; i < Math.min(buffer.length, 50000); i++) {
            const byte = buffer[i];
            if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
                raw += String.fromCharCode(byte);
            }
            }
            // Clean up and extract meaningful text chunks (min 4 chars)
            decodedText = raw
            .split(/\s+/)
            .filter(w => w.length > 3)
            .join(' ')
            .substring(0, 8000);

            if (decodedText.length < 50) {
            decodedText = `DOCX file: ${fileName}. Content could not be extracted.`;
            }
        } else if (mimeType === 'application/vnd.ms-outlook' || fileName.endsWith('.msg')) {
            // MSG files — extract only readable ASCII text
            let raw = '';
            for (let i = 0; i < Math.min(buffer.length, 100000); i++) {
            const byte = buffer[i];
            if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13) {
                raw += String.fromCharCode(byte);
            }
            }
            // Extract readable words only
            decodedText = raw
            .split(/\s+/)
            .filter(w => w.length > 3 && /^[a-zA-Z0-9@.,!?:;'()\-_]+$/.test(w))
            .join(' ')
            .substring(0, 8000);

            if (decodedText.length < 50) {
            decodedText = `Email file: ${fileName}. Content could not be extracted.`;
            }
        } else {
            // Plain text files
            decodedText = buffer.toString('utf8');
        }
        } catch (decodeErr) {
        console.error(`[RPA] Decode error for ${fileName}:`, decodeErr.message);
        decodedText = `File: ${fileName}. Could not decode content.`;
        }
    }
    } else {
    decodedText = fileContent || '';
    }

    // Always sanitize final text
    decodedText = sanitizeForJson(decodedText);
    console.log(`[RPA] Final decoded text for ${fileName}: "${decodedText.substring(0, 300)}"`);

    // If sanitization made it empty, use filename as context
    if (decodedText.length < 20) {
    decodedText = `File: ${fileName}. Please generate a knowledge base article based on the filename context.`;
    }

    // ── Duplicate check ─────────────────────────────────────────────────
    const hashSource = encoding === 'base64'
      ? fileContent.substring(0, 10000)
      : decodedText.substring(0, 10000);
    const hash = crypto.createHash('md5').update(hashSource).digest('hex');

    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('ingestion_log')
      .select('id')
      .eq('file_hash', hash)
      .gte('created_at', cutoff);

    if (existing && existing.length > 0) {
      await supabase.from('ingestion_log').insert([{
        file_hash: hash,
        file_name: fileName,
        source: source || 'google_drive',
        status: 'duplicate'
      }]);
      return res.json({ status: 'duplicate', message: 'Already processed in last 14 days' });
    }

    // ── Call Gemini AI ──────────────────────────────────────────────────
    console.log(`[RPA] Running AI on: ${fileName}`);
    let aiResult = null;

    if (isImage && imageBase64) {
      aiResult = await generateFromImage(imageBase64, fileName);
    } else {
      aiResult = await generateArticleContent(decodedText, fileName);
    }

    // ── Conflict check ──────────────────────────────────────────────────
    const aiTags = aiResult ? aiResult.tags : ['rpa-ingested'];
    const aiTitle = aiResult ? aiResult.title : `[RPA] ${fileName}`;
    const conflicts = await checkConflicts(aiTitle, aiTags, null);
    const hasConflict = conflicts.length > 0;
    const conflictNote = hasConflict
      ? `Possible conflict with: ${conflicts.map(c => `"${c.title}" (${c.status})`).join(', ')}`
      : null;

    // ── Save article with AI content ────────────────────────────────────
    const articleData = {
        title: aiResult ? aiResult.title : `[RPA] ${fileName}`,
        summary: aiResult ? aiResult.summary : null,
        steps: aiResult ? aiResult.steps : null,
        tags: aiResult
            ? [...new Set([...aiResult.tags, 'rpa-ingested'])]
            : ['rpa-ingested'],
        raw_input: decodedText.substring(0, 5000),
        status: 'draft',
        conflict_flag: hasConflict,
        conflict_note: conflictNote,
        created_by: process.env.RPA_USER_ID || null
        };

    const { data: article, error } = await supabase
      .from('articles')
      .insert([articleData])
      .select()
      .single();

    if (error) {
      await supabase.from('ingestion_log').insert([{
        file_hash: hash, file_name: fileName,
        source, status: 'failed', error_message: error.message
      }]);
      return res.status(500).json({ error: error.message });
    }

    // ── Save version 1 ──────────────────────────────────────────────────
    await supabase.from('article_versions').insert([{
      article_id: article.id,
      version_number: 1,
      title: article.title,
      summary: article.summary,
      steps: article.steps,
      tags: article.tags,
      status: 'draft',
      change_note: `Auto-ingested by RPA from ${source || 'google_drive'}`
    }]);

    // ── Upload original file to Supabase Storage & save attachment ──────
    const articleId = article.id; // capture before any async calls
    try {
      let fileBuffer;
      const storageMime = mimeType || 'application/octet-stream';

      if (encoding === 'base64') {
        fileBuffer = Buffer.from(fileContent, 'base64');
      } else {
        fileBuffer = Buffer.from(fileContent, 'utf8');
      }

      console.log(`[ATTACH] ${fileName} → articleId: ${articleId}, buffer: ${fileBuffer.length} bytes`);

      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `rpa/${articleId}_${safeFileName}`; // use articleId not Date.now()

      const { data: uploadData, error: storageError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, fileBuffer, {
          contentType: storageMime,
          upsert: true // changed to true to avoid conflicts on re-run
        });

      if (storageError) {
        console.error(`[ATTACH] Storage upload failed:`, storageError.message);
      } else {
        console.log(`[ATTACH] Upload OK:`, uploadData?.path);

        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(storagePath);

        const { error: insertError } = await supabase
          .from('attachments')
          .insert([{
            article_id: articleId,
            file_name: fileName,
            file_url: urlData.publicUrl,
            file_type: mimeType ? mimeType.split('/')[1] : 'unknown',
            uploaded_by: process.env.RPA_USER_ID || null
          }]);

        if (insertError) {
          console.error(`[ATTACH] DB insert failed:`, insertError.message);
        } else {
          console.log(`[ATTACH] Saved: ${fileName} → article ${articleId}`);
        }
      }
    } catch (attachErr) {
      console.error(`[ATTACH] Exception:`, attachErr.message);
    }
    
    // ── Log ingestion ───────────────────────────────────────────────────
    await supabase.from('ingestion_log').insert([{
      file_hash: hash,
      file_name: fileName,
      source: source || 'google_drive',
      status: 'created',
      article_id: article.id
    }]);

    console.log(`[RPA] Created article: ${article.title}`);
    res.json({
      status: 'created',
      article_id: article.id,
      title: article.title,
      ai_processed: aiResult !== null
    });

  } catch (err) {
    console.error('RPA ingest error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/rpa/log ─────────────────────────────────────────────────────
router.post('/log', rpaAuth, async (req, res) => {
  const { total_files, created_count, updated_count, duplicate_count, failed_count, log_text } = req.body;

  await supabase.from('rpa_run_logs').insert([{
    total_files, created_count, updated_count,
    duplicate_count, failed_count, log_text
  }]);

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: `[DHL KB] RPA Run Summary — ${new Date().toLocaleDateString()}`,
      html: `
        <h2 style="color:#D40511">DHL Knowledge Base — RPA Run Summary</h2>
        <table border="1" cellpadding="8" style="border-collapse:collapse">
          <tr><td><b>Total Files</b></td><td>${total_files}</td></tr>
          <tr><td><b>Created</b></td><td style="color:green">${created_count}</td></tr>
          <tr><td><b>Updated</b></td><td>${updated_count}</td></tr>
          <tr><td><b>Duplicates</b></td><td style="color:orange">${duplicate_count}</td></tr>
          <tr><td><b>Failed</b></td><td style="color:red">${failed_count}</td></tr>
        </table>
        <h3>Run Log</h3>
        <pre style="background:#f5f5f5;padding:12px;font-size:12px">${log_text}</pre>
      `
    });

    res.json({ message: 'Log saved and email sent' });
  } catch (emailErr) {
    console.error('Email error:', emailErr.message);
    res.json({ message: 'Log saved but email failed: ' + emailErr.message });
  }
});

module.exports = router;