const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const upload = multer({ storage: multer.memoryStorage() });

router.post('/', auth, upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  let extractedText = '';
  const mime = file.mimetype;

  try {
    if (mime === 'application/pdf') {
      const parsed = await pdfParse(file.buffer);
      extractedText = parsed.text;
    } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = result.value;
    } else if (mime.startsWith('text/')) {
      extractedText = file.buffer.toString('utf-8');
    } else if (mime.startsWith('image/')) {
      // Return base64 for GPT Vision processing
      extractedText = `[IMAGE:${file.buffer.toString('base64')}:${mime}]`;
    }

    // Upload file to Supabase Storage
    const fileName = `${Date.now()}-${file.originalname}`;
    const { data: storageData } = await supabase.storage.from('attachments').upload(fileName, file.buffer, { contentType: mime });
    const fileUrl = supabase.storage.from('attachments').getPublicUrl(fileName).data.publicUrl;

    res.json({ extractedText, fileUrl, fileName: file.originalname, fileType: mime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;