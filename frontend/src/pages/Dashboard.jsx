import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

export default function Dashboard() {
  const [stats, setStats] = useState({ draft: 0, reviewed: 0, published: 0, total: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    axios.get(`${API}/articles`, { headers: getHeaders() }).then(r => {
      const arts = r.data;
      setStats({
        draft: arts.filter(a => a.status === 'draft').length,
        reviewed: arts.filter(a => a.status === 'reviewed').length,
        published: arts.filter(a => a.status === 'published').length,
        total: arts.length
      });
      setRecent(arts.slice(0, 5));
      setLoading(false);
    });
  }, []);

  const statusColors = { draft: '#6c757d', reviewed: '#f39c12', published: '#27ae60' };
  const statusBg = { draft: '#f0f0f0', reviewed: '#fff8e6', published: '#eafaf1' };

  const cards = [
    { label: 'Draft', count: stats.draft, color: '#6c757d', bg: '#f8f9fa', icon: '📝', path: '/viewer?status=draft', desc: 'Pending review' },
    { label: 'Reviewed', count: stats.reviewed, color: '#f39c12', bg: '#fffbf0', icon: '✅', path: '/viewer?status=reviewed', desc: 'Ready to publish' },
    { label: 'Published', count: stats.published, color: '#27ae60', bg: '#f0fdf4', icon: '🚀', path: '/viewer?status=published', desc: 'Live articles' },
    { label: 'Total', count: stats.total, color: '#D40511', bg: '#fff5f5', icon: '📚', path: '/viewer', desc: 'All articles' }
  ];

  const getFirstName = () => {
    if (user.full_name) return user.full_name.split(' ')[0];
    if (user.email) return user.email.split('@')[0];
    return 'User';
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: '#999' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <p>Loading dashboard...</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', padding: '32px 32px 48px' }}>

      {/* ── Welcome Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #D40511 0%, #ff4444 60%, #ff6b35 100%)',
        borderRadius: 16, padding: '32px 36px', marginBottom: 28,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 8px 32px rgba(212,5,17,0.25)', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 6px', fontSize: 14 }}>
            {getGreeting()}, 👋
          </p>
          <h1 style={{
            color: 'white', margin: '0 0 6px', fontSize: 28,
            fontWeight: 800, letterSpacing: -0.5
          }}>
            {getFirstName()}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', margin: 0, fontSize: 14 }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            &nbsp;·&nbsp; Role: <strong style={{ color: 'white' }}>{user.role}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {['admin', 'editor'].includes(user.role) && (
            <button onClick={() => navigate('/upload')}
              style={{
                padding: '11px 24px', background: '#FFCC00',
                color: '#D40511', border: 'none', borderRadius: 10,
                fontSize: 14, cursor: 'pointer', fontWeight: 800,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
              + Upload Content
            </button>
          )}
          <button onClick={() => navigate('/viewer')}
            style={{
              padding: '11px 24px', background: 'rgba(255,255,255,0.2)',
              color: 'white', border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 600
            }}>
            View All Articles →
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {cards.map(c => (
          <div key={c.label} onClick={() => navigate(c.path)}
            style={{
              background: c.bg, border: `1.5px solid ${c.color}22`,
              borderRadius: 14, padding: '20px 22px', cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${c.color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>
                  {c.label}
                </p>
                <div style={{ fontSize: 36, fontWeight: 900, color: c.color, lineHeight: 1 }}>
                  {c.count}
                </div>
                <p style={{ color: '#aaa', fontSize: 12, margin: '6px 0 0' }}>{c.desc}</p>
              </div>
              <div style={{
                fontSize: 28, background: `${c.color}18`,
                borderRadius: 10, padding: '8px 10px'
              }}>
                {c.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts + Recent Articles ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 28 }}>

        {/* Recent Articles */}
        <div style={{ background: 'white', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#333', fontWeight: 700 }}>🕐 Recent Articles</h3>
            <button onClick={() => navigate('/viewer')}
              style={{ background: 'none', border: 'none', color: '#D40511', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              View all →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recent.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No articles yet</p>
            ) : recent.map(a => (
              <div key={a.id} onClick={() => navigate(`/draft/${a.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                  background: '#fafafa', border: '1px solid #f0f0f0',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f0f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#fafafa'}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: statusColors[a.status]
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 13, fontWeight: 600, color: '#333',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {a.title}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>
                    {new Date(a.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                  background: statusBg[a.status], color: statusColors[a.status],
                  whiteSpace: 'nowrap'
                }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}