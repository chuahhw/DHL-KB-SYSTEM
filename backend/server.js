require('@dotenvx/dotenvx').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Verify env loaded
console.log('[ENV] SUPABASE_URL:', process.env.SUPABASE_URL ? '✅' : '❌ MISSING');
console.log('[ENV] SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅' : '❌ MISSING');
console.log('[ENV] GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅' : '❌ MISSING');
console.log('[ENV] RPA_USER_ID:', process.env.RPA_USER_ID || '❌ MISSING - run the SQL in Step 3');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/rpa', require('./routes/rpa'));

app.get('/', (req, res) => res.json({ status: 'DHL KB API running' }));

app.listen(5000, () => console.log('Server running on http://localhost:5000'));