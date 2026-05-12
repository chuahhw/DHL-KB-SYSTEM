import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function ViewerPage() {
  const [articles, setArticles] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterCreator, setFilterCreator] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [allTags, setAllTags] = useState([]);
  const navigate = useNavigate();

  const load = async () => {
    const params = {};
    if (search) params.search = search;
    if (filterStatus) params.status = filterStatus;
    if (filterTag) params.tag = filterTag;
    if (filterCreator) params.creator = filterCreator;
    const res = await axios.get(`${API}/articles`, { headers: getHeaders(), params });
    let data = res.data;

    // Date filtering (client-side)
    if (filterDateFrom) data = data.filter(a => new Date(a.created_at) >= new Date(filterDateFrom));
    if (filterDateTo) data = data.filter(a => new Date(a.created_at) <= new Date(filterDateTo + 'T23:59:59'));

    setArticles(data);

    // Collect all unique tags
    const tags = [...new Set(data.flatMap(a => a.tags || []))].sort();
    setAllTags(tags);
  };

  const loadUsers = async () => {
    try {
        const res = await axios.get(`${API}/articles`, { headers: getHeaders() });
        // Extract unique creators from articles
        const creatorMap = {};
        res.data.forEach(a => {
        if (a.created_by && a.users) {
            creatorMap[a.created_by] = a.users.full_name || a.users.email;
        }
        });
        setUsers(Object.entries(creatorMap).map(([id, name]) => ({ id, name })));
    } catch {}
  };

  useEffect(() => { load(); loadUsers(); }, []);
  useEffect(() => { load(); }, [search, filterStatus, filterTag, filterCreator, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterTag('');
    setFilterCreator(''); setFilterDateFrom(''); setFilterDateTo('');
  };

  const hasFilters = search || filterStatus || filterTag || filterCreator || filterDateFrom || filterDateTo;

  const statusColors = { draft: '#6c757d', reviewed: '#f39c12', published: '#27ae60' };
  const statusBg = { draft: '#f0f0f0', reviewed: '#fff8e6', published: '#eafaf1' };

  return (
    <div style={{ maxWidth: 960, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: '#D40511', margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>All Articles</h2>
        <span style={{ color: '#999', fontSize: 13 }}>{articles.length} article{articles.length !== 1 ? 's' : ''} found</span>
      </div>

      {/* Filter Panel */}
      <div style={{ background: 'white', border: '1px solid #eee', borderRadius: 10, padding: 20, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>

        {/* Search */}
        <div style={{ marginBottom: 14 }}>
          <input
            placeholder="🔍 Search by title..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {/* Filter row 1 */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 12, color: '#999', fontWeight: 600, display: 'block', marginBottom: 4 }}>STATUS</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="reviewed">Reviewed</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 12, color: '#999', fontWeight: 600, display: 'block', marginBottom: 4 }}>TAG</label>
            <select value={filterTag} onChange={e => setFilterTag(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
              <option value="">All Tags</option>
              {allTags.map(t => <option key={t} value={t}>#{t}</option>)}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 12, color: '#999', fontWeight: 600, display: 'block', marginBottom: 4 }}>CREATOR</label>
            <select value={filterCreator} onChange={e => setFilterCreator(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}>
              <option value="">All Creators</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Filter row 2 — dates */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 12, color: '#999', fontWeight: 600, display: 'block', marginBottom: 4 }}>DATE FROM</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={{ fontSize: 12, color: '#999', fontWeight: 600, display: 'block', marginBottom: 4 }}>DATE TO</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minWidth: 150, display: 'flex', alignItems: 'flex-end' }}>
            {hasFilters && (
              <button onClick={clearFilters}
                style={{ width: '100%', padding: '9px 12px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', color: '#666', fontSize: 14 }}>
                ✕ Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Article List */}
      {articles.length === 0 && (
        <div style={{ textAlign: 'center', color: '#aaa', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <p>No articles found. Try adjusting your filters.</p>
        </div>
      )}

      {articles.map(a => (
        <div key={a.id}
          onClick={() => navigate(`/draft/${a.id}`)}
          style={{
            background: 'white', border: '1px solid #eee', borderRadius: 10,
            padding: 20, marginBottom: 12, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            borderLeft: `4px solid ${statusColors[a.status]}`,
            transition: 'box-shadow 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <h3 style={{ margin: 0, color: '#222', fontSize: 16, flex: 1, marginRight: 12 }}>{a.title}</h3>
            <span style={{
              background: statusColors[a.status], color: 'white',
              borderRadius: 12, padding: '2px 12px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap'
            }}>
              {a.status.toUpperCase()}
            </span>
          </div>
          
          {a.conflict_flag && (
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#fff3cd', border: '1px solid #ffc107',
                borderRadius: 6, padding: '3px 10px',
                fontSize: 12, color: '#856404', marginBottom: 8
            }}>
                ⚠️ {a.conflict_note || 'Possible conflict detected'}
            </div>
          )}

          {a.summary && (
            <p style={{ color: '#666', margin: '0 0 10px', fontSize: 14, lineHeight: 1.5 }}>
              {a.summary.length > 120 ? a.summary.slice(0, 120) + '...' : a.summary}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(a.tags || []).map(t => (
                <span key={t} style={{ background: '#f0f2f5', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#555' }}>#{t}</span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#aaa', display: 'flex', gap: 16 }}>
              <span>👤 {a.users?.full_name || a.users?.email || 'Unknown'}</span>
              <span>📅 {new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}