const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, full_name, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase.from('users').insert([{ email, password_hash: hash, full_name, role }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'User created', user: { id: data.id, email: data.email, role: data.role } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role, full_name: user.full_name } });
});

// GET /api/auth/users — get list of users for creator filter (any logged in user)
const authMiddleware = require('../middleware/authMiddleware');
router.get('/users', authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .order('full_name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;