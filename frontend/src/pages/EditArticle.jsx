import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function EditArticle() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [steps, setSteps] = useState(['']);
  const [tags, setTags] = useState('');
  const [currentStatus, setCurrentStatus] = useState('draft');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    axios.get(`${API}/articles/${id}`, { headers: getHeaders() }).then(r => {
      const a = r.data;

      setTitle(a.title || '');
      setSummary(a.summary || '');
      setSteps(Array.isArray(a.steps) && a.steps.length > 0 ? a.steps : ['']);
      setTags((a.tags || []).join(', '));
      setCurrentStatus(a.status);

      // Block unauthorized access AFTER setting state
      const isDraft = a.status === 'draft';
      const isOwner = String(user.id) === String(a.created_by);
      const allowed =
        (role === 'admin' && isDraft) ||
        (role === 'editor' && isOwner && isDraft);

      if (!allowed) {
        navigate(`/draft/${id}`);
      }
    });
  }, [id]);

  const updateStep = (i, val) => setSteps(prev => prev.map((s, idx) => idx === i ? val : s));
  const addStep = () => setSteps(prev => [...prev, '']);
  const removeStep = (i) => setSteps(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!title.trim()) return setMsg({ text: 'Title is required', type: 'error' });
    setSaving(true); setMsg({ text: '', type: '' });
    try {
      await axios.put(`${API}/articles/${id}`, {
        title,
        summary,
        steps: steps.filter(s => s.trim()),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status: currentStatus,
        change_note: 'Edited'
      }, { headers: getHeaders() });

      setMsg({ text: '✅ Saved! Redirecting...', type: 'success' });
      setTimeout(() => navigate(`/draft/${id}`), 800);
    } catch (err) {
      setMsg({ text: '❌ ' + (err.response?.data?.error || err.message), type: 'error' });
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', border: '1px solid #ddd',
    borderRadius: 6, fontSize: 14, marginTop: 4, boxSizing: 'border-box'
  };

  return (
    <div style={{ maxWidth: 820, margin: '40px auto', padding: '0 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: '#D40511', margin: 0 }}>Edit Article</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0' }}>
            Role: <strong style={{ color: '#333' }}>{role}</strong>
          </p>
        </div>
        <button onClick={() => navigate(`/draft/${id}`)}
          style={{ background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', color: '#666' }}>
          ✕ Cancel
        </button>
      </div>

      {/* Message */}
      {msg.text && (
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 6, fontSize: 14,
          background: msg.type === 'error' ? '#fee2e2' : '#d1fae5',
          color: msg.type === 'error' ? '#c00' : '#065f46'
        }}>
          {msg.text}
        </div>
      )}

      {/* Form */}
      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: 12, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Article title..." style={inputStyle} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>Summary</label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)}
            rows={3} placeholder="Brief description..."
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>Steps</label>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <span style={{ padding: '10px 0', color: '#999', minWidth: 24, fontSize: 13 }}>{i + 1}.</span>
              <input value={s} onChange={e => updateStep(i, e.target.value)}
                placeholder={`Step ${i + 1}`}
                style={{ ...inputStyle, marginTop: 0 }} />
              <button onClick={() => removeStep(i)}
                style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '0 12px', cursor: 'pointer', color: '#c00', fontSize: 16 }}>
                ✕
              </button>
            </div>
          ))}
          <button onClick={addStep}
            style={{ marginTop: 8, background: '#f0f0f0', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
            + Add Step
          </button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>Tags <span style={{ color: '#999', fontWeight: 400 }}>(comma separated)</span></label>
          <input value={tags} onChange={e => setTags(e.target.value)}
            placeholder="e.g. onboarding, SOP, DHL" style={inputStyle} />
        </div>
      </div>

      {/* Save & Cancel buttons */}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '11px 28px', background: saving ? '#aaa' : '#D40511', color: 'white', border: 'none', borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 15 }}>
          {saving ? 'Saving...' : '💾 Save'}
        </button>
        <button onClick={() => navigate(`/draft/${id}`)}
          style={{ padding: '11px 28px', background: '#f5f5f5', color: '#666', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}