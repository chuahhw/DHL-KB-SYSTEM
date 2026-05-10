import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:5000/api';
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function DraftBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;

  const [article, setArticle] = useState(null);
  const [versions, setVersions] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const fetchArticle = () => {
    setLoading(true);
    axios.get(`${API}/articles/${id}`, { headers: getHeaders() }).then(r => {
      setArticle(r.data);
      setVersions(r.data.article_versions || []);
      // Fetch attachments
      axios.get(`${API}/articles/${id}/attachments`, { headers: getHeaders() })
      .then(r => setAttachments(r.data || []))
      .catch(() => {});
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { if (id) fetchArticle(); }, [id]);

  if (loading) return <div style={{ padding: 40, color: '#999' }}>Loading...</div>;
  if (!article) return <div style={{ padding: 40, color: '#c00' }}>Article not found.</div>;

  const { status, created_by } = article;
  const isOwner = user.id === created_by;
  const isDraft = status === 'draft';
  const isReviewed = status === 'reviewed';
  const isPublished = status === 'published';

  // Button visibility rules
  const canEdit =
    !isPublished && !isReviewed && (
      role === 'admin' ||
      role === 'editor'
    );

  const canMarkReviewed = (isDraft) && (role === 'admin' || role === 'reviewer');

  const canPublish = (isReviewed) && (role === 'admin' || role === 'reviewer');

  const canDelete =
    role === 'admin';

  const handleStatusChange = async (newStatus) => {
    setSaving(true); setMsg({ text: '', type: '' });
    try {
      await axios.put(`${API}/articles/${id}`, { ...article, status: newStatus }, { headers: getHeaders() });
      setMsg({ text: `✅ Marked as ${newStatus}`, type: 'success' });
      fetchArticle(); // refresh article status
    } catch (err) {
      setMsg({ text: '❌ ' + (err.response?.data?.error || err.message), type: 'error' });
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/articles/${id}`, { headers: getHeaders() });
      navigate('/viewer');
    } catch (err) {
      setMsg({ text: '❌ ' + (err.response?.data?.error || err.message), type: 'error' });
      setDeleting(false);
    }
  };

  const statusColors = { draft: '#6c757d', reviewed: '#f39c12', published: '#27ae60' };

  const fieldBox = {
    background: '#f9f9f9', border: '1px solid #eee',
    borderRadius: 8, padding: '12px 16px', marginTop: 4
  };

  return (
    <div style={{ maxWidth: 820, margin: '40px auto', padding: '0 20px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ color: '#D40511', margin: 0 }}>Article Details</h2>
          <p style={{ color: '#999', fontSize: 13, margin: '4px 0 0' }}>
            Role: <strong style={{ color: '#333' }}>{role}</strong>
            <span style={{
              marginLeft: 12, background: statusColors[status],
              color: 'white', borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700
            }}>
              {status.toUpperCase()}
            </span>
          </p>
        </div>
        <button onClick={() => navigate('/viewer')}
          style={{ background: '#f5f5f5', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', color: '#666' }}>
          ← Back
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

      {/* Conflict Warning Banner */}
        {article.conflict_flag && (
        <div style={{
            background: '#fff3cd', border: '1px solid #ffc107',
            borderRadius: 8, padding: '12px 16px', marginBottom: 20,
            display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div>
            <strong style={{ color: '#856404', display: 'block', marginBottom: 2 }}>
                Conflict Detected
            </strong>
            <span style={{ color: '#856404', fontSize: 13 }}>
                {article.conflict_note || 'This article may conflict with an existing one.'}
            </span>
            </div>
        </div>
        )}

      {/* Article content — view only */}
      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: 12, padding: 28, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 700, fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Title</label>
          <div style={{ ...fieldBox, fontSize: 18, fontWeight: 700, color: '#222' }}>{article.title || '—'}</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 700, fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Summary</label>
          <div style={{ ...fieldBox, color: '#444', lineHeight: 1.6 }}>{article.summary || '—'}</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 700, fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Steps</label>
          <div style={{ ...fieldBox }}>
            {Array.isArray(article.steps) && article.steps.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                {article.steps.map((s, i) => (
                  <li key={i} style={{ padding: '4px 0', color: '#444', lineHeight: 1.6 }}>{s}</li>
                ))}
              </ol>
            ) : <span style={{ color: '#aaa' }}>No steps defined</span>}
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontWeight: 700, fontSize: 12, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Tags</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {(article.tags || []).length > 0
              ? article.tags.map(t => (
                <span key={t} style={{ background: '#f0f2f5', border: '1px solid #e0e0e0', borderRadius: 6, padding: '3px 10px', fontSize: 13 }}>#{t}</span>
              ))
              : <span style={{ color: '#aaa' }}>No tags</span>
            }
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 32 }}>

        {/* Edit — admin or editor, only on draft */}
        {canEdit && (
          <button onClick={() => navigate(`/edit/${id}`)}
            style={{ padding: '10px 22px', background: '#3498db', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            ✏️ Edit
          </button>
        )}

        {/* Mark as Reviewed — admin & reviewer */}
        {canMarkReviewed && (
          <button onClick={() => handleStatusChange('reviewed')} disabled={saving}
            style={{ padding: '10px 22px', background: '#f39c12', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            ✅ Mark as Reviewed
          </button>
        )}

        {/* Publish — admin & editor */}
        {canPublish && (
          <button onClick={() => handleStatusChange('published')} disabled={saving}
            style={{ padding: '10px 22px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            🚀 Publish
          </button>
        )}

        <div style={{ flex: 1 }} />

        {/* Delete */}
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting}
            style={{ padding: '10px 22px', background: '#fee2e2', color: '#c00', border: '1px solid #fca5a5', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
            🗑️ {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

        {/* Attachments */}
{attachments.length > 0 && (
  <div style={{ marginTop: 32, borderTop: '1px solid #eee', paddingTop: 24 }}>
    <h3 style={{ color: '#333', marginBottom: 12, fontSize: 16 }}>
      📎 Attached Files ({attachments.length})
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {attachments.map(att => {
        const iconMap = {
          pdf: '📄', docx: '📝', doc: '📝',
          jpeg: '🖼️', jpg: '🖼️', png: '🖼️',
          txt: '📃', msg: '📧'
        };
        const icon = iconMap[att.file_type] || '📎';
        return (
          <div key={att.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#f9f9f9', border: '1px solid #eee',
            borderRadius: 8, padding: '10px 14px'
          }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{att.file_name}</div>
              <div style={{ fontSize: 11, color: '#aaa' }}>
                {att.file_type?.toUpperCase()} • Uploaded by RPA •{' '}
                {new Date(att.created_at).toLocaleDateString()}
              </div>
            </div>
            <a href={att.file_url} target="_blank" rel="noreferrer"
              style={{
                padding: '6px 14px', background: '#D40511', color: 'white',
                borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600
              }}>
              View
            </a>
          </div>
        );
      })}
    </div>
  </div>
)}

      {/* Version History */}
{versions.length > 0 && (
  <div style={{ borderTop: '1px solid #eee', paddingTop: 24 }}>
    <h3 style={{ color: '#333', marginBottom: 16, fontSize: 16 }}>Version History</h3>

    {/* Status flow diagram */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20, flexWrap: 'wrap' }}>
      {['draft', 'reviewed', 'published'].map((s, i) => {
        const reached = versions.some(v => v.status === s);
        const isCurrent = article.status === s;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: reached ? statusColors[s] : '#eee',
              color: reached ? 'white' : '#aaa',
              border: isCurrent ? `2px solid #333` : '2px solid transparent',
              transition: 'all 0.2s'
            }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
            {i < 2 && (
              <div style={{ width: 32, height: 2, background: reached ? '#ddd' : '#eee', margin: '0 2px' }} />
            )}
          </div>
        );
      })}
    </div>

    {/* Version log */}
    {[...versions].reverse().map((v, idx) => (
      <div key={v.id} style={{
        display: 'flex', gap: 12, alignItems: 'center',
        padding: '10px 12px', borderRadius: 8, marginBottom: 6,
        background: idx === 0 ? '#fafafa' : 'white',
        border: '1px solid #f0f0f0'
      }}>
        <span style={{
          background: statusColors[v.status] || '#ddd', color: 'white',
          borderRadius: 10, padding: '2px 10px', fontSize: 11,
          fontWeight: 700, minWidth: 28, textAlign: 'center'
        }}>
          v{v.version_number}
        </span>
        <span style={{ flex: 1, fontSize: 13, color: '#555' }}>
          {v.change_note || 'Status Updated'}
        </span>
        <span style={{
          background: statusColors[v.status] || '#eee', color: 'white',
          borderRadius: 10, padding: '2px 10px', fontSize: 11
        }}>
          {v.status}
        </span>
        <span style={{ fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>
          {new Date(v.created_at).toLocaleString('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </span>
      </div>
    ))}
  </div>
)}
    </div>
  );
}