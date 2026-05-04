const router = require('express').Router();
const auth = require('../middleware/authMiddleware');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// GET /api/articles — anyone logged in can view
router.get('/', auth, async (req, res) => {
  const { status, tag, search, creator } = req.query;
  let query = supabase
    .from('articles')
    .select('*, users!articles_created_by_fkey(full_name, email)')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (creator) query = query.eq('created_by', creator);
  if (tag) query = query.contains('tags', [tag]);
  if (search) query = query.ilike('title', `%${search}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/articles/:id — anyone logged in can view
router.get('/:id', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('articles')
    .select('*, article_versions(*)')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// POST /api/articles — create new
router.post('/', auth, async (req, res) => {
  const { role } = req.user;
  if (!['admin', 'editor'].includes(role)) {
    return res.status(403).json({ error: 'Only admins and editors can create articles' });
  }

  const { title, summary, steps, tags, raw_input, status, conflict_flag, conflict_note } = req.body;

  // Auto conflict check if not already provided
  let finalConflictFlag = conflict_flag || false;
  let finalConflictNote = conflict_note || null;

  if (!conflict_flag) {
    const { data: existing } = await supabase
      .from('articles')
      .select('id, title, tags, status');

    const newTags = (tags || []).map(t => t.toLowerCase());
    const newTitleWords = (title || '').toLowerCase().split(' ').filter(w => w.length > 3);

    const ignoreTags = ['rpa-ingested','file','text','image','dhl','operations','reference','troubleshooting','procedure'];
const meaningfulNewTags = newTags.filter(t => !ignoreTags.includes(t) && t.length > 3);

    const conflicts = (existing || []).filter(a => {
    const existingTags = (a.tags || []).map(t => t.toLowerCase())
        .filter(t => !ignoreTags.includes(t) && t.length > 3);
    const matchingTags = existingTags.filter(t => meaningfulNewTags.includes(t));
    const tagMatch = matchingTags.length >= 2;
    const matchingWords = newTitleWords.filter(w => (a.title || '').toLowerCase().includes(w));
    const titleMatch = matchingWords.length >= 3;
    return tagMatch || titleMatch;
    }).slice(0, 3);

    if (conflicts.length > 0) {
      finalConflictFlag = true;
      finalConflictNote = `Possible conflict with: ${conflicts.map(c => `"${c.title}" (${c.status})`).join(', ')}`;
    }
  }

  const { data, error } = await supabase
    .from('articles')
    .insert([{
      title, summary, steps, tags, raw_input,
      status: status || 'draft',
      created_by: req.user.id,
      conflict_flag: finalConflictFlag,
      conflict_note: finalConflictNote
    }])
    .select().single();

  if (error) return res.status(400).json({ error: error.message });

  await supabase.from('article_versions').insert([{
    article_id: data.id, version_number: 1,
    title, summary, steps, tags, status: data.status,
    changed_by: req.user.id, change_note: 'Initial draft'
  }]);

  res.json(data);
});

// PUT /api/articles/:id — role-based update
router.put('/:id', auth, async (req, res) => {
  const { role, id: userId } = req.user;

  // Fetch the article first
  const { data: article, error: fetchError } = await supabase
    .from('articles')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (fetchError) return res.status(404).json({ error: 'Article not found' });

  const { title, summary, steps, tags, status, conflict_flag, conflict_note, change_note } = req.body;

  // REVIEWER — can only mark as reviewed, nothing else
  if (role === 'reviewer') {
    if (status !== 'reviewed') {
      return res.status(403).json({ error: 'Reviewers can only mark articles as reviewed' });
    }
    // Can only review articles that are in draft status
    if (article.status !== 'draft') {
      return res.status(403).json({ error: 'Only draft articles can be marked as reviewed' });
    }
    const { data, error } = await supabase
      .from('articles')
      .update({ status: 'reviewed', reviewed_by: userId, updated_at: new Date() })
      .eq('id', req.params.id)
      .select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Log version
    const { data: versions } = await supabase
      .from('article_versions').select('version_number')
      .eq('article_id', req.params.id).order('version_number', { ascending: false }).limit(1);
    const nextVersion = versions?.length ? versions[0].version_number + 1 : 1;
    await supabase.from('article_versions').insert([{
      article_id: req.params.id, version_number: nextVersion,
      title: article.title, summary: article.summary,
      steps: article.steps, tags: article.tags,
      status: 'reviewed', changed_by: userId, change_note: 'Marked as reviewed'
    }]);

    return res.json(data);
  }

  // EDITOR — can only edit/save their own drafts, cannot publish
  if (role === 'editor') {
    if (article.created_by !== userId) {
      return res.status(403).json({ error: 'Editors can only edit their own articles' });
    }
    if (article.status === 'published') {
      return res.status(403).json({ error: 'Editors cannot edit published articles' });
    }
    if (status === 'published') {
      return res.status(403).json({ error: 'Editors cannot publish articles' });
    }
    if (status === 'reviewed') {
      return res.status(403).json({ error: 'Editors cannot mark articles as reviewed' });
    }
  }

  // ADMIN — can do everything
  const updateData = {
    title, summary, steps, tags,
    status: status || article.status,
    conflict_flag, conflict_note,
    updated_at: new Date()
  };
  if (status === 'published') updateData.published_by = userId;
  if (status === 'reviewed') updateData.reviewed_by = userId;

  const { data, error } = await supabase
    .from('articles').update(updateData)
    .eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });

  // Log version
  const { data: versions } = await supabase
    .from('article_versions').select('version_number')
    .eq('article_id', req.params.id).order('version_number', { ascending: false }).limit(1);
  const nextVersion = versions?.length ? versions[0].version_number + 1 : 1;
  await supabase.from('article_versions').insert([{
    article_id: req.params.id, version_number: nextVersion,
    title, summary, steps, tags, status: updateData.status,
    changed_by: userId, change_note: change_note || 'Updated'
  }]);

  res.json(data);
});

// DELETE /api/articles/:id — admin can delete any, editor can delete own drafts only
router.delete('/:id', auth, async (req, res) => {
  const { role, id: userId } = req.user;

  if (role === 'reviewer') {
    return res.status(403).json({ error: 'Reviewers cannot delete articles' });
  }

  const { data: article, error: fetchError } = await supabase
    .from('articles').select('*').eq('id', req.params.id).single();
  if (fetchError) return res.status(404).json({ error: 'Article not found' });

  if (role === 'editor') {
    if (article.created_by !== userId) {
      return res.status(403).json({ error: 'Editors can only delete their own articles' });
    }
    if (article.status !== 'draft') {
      return res.status(403).json({ error: 'Editors can only delete draft articles' });
    }
  }

  const { error } = await supabase.from('articles').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Deleted successfully' });
});

// GET /api/articles/:id/attachments
router.get('/:id/attachments', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('article_id', req.params.id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;