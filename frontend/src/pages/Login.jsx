import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('editor');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !password) return setError('Email and password are required');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (mode === 'signup' && !fullName) return setError('Full name is required');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await axios.post(`${API}/auth/login`, { email, password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      } else {
        await axios.post(`${API}/auth/register`, { email, password, full_name: fullName, role });
        setSuccess('Account created! You can now log in.');
        setMode('login');
        setPassword('');
        setFullName('');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
    setLoading(false);
  };

  const inputStyle = {
    width: '100%', padding: '12px 16px',
    border: '1.5px solid #e5e7eb', borderRadius: 8,
    fontSize: 15, marginTop: 6, boxSizing: 'border-box',
    outline: 'none', background: '#fafafa', color: '#222'
  };

  const labelStyle = {
    display: 'block', marginBottom: 2,
    fontWeight: 600, fontSize: 14, color: '#444'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100vw',
      margin: 0,
      padding: 0,
      background: 'white',
      boxSizing: 'border-box'
    }}>

      {/* ── Red top banner — full width ── */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(135deg, #D40511, #ff2020)',
        padding: '60px 0 50px',
        textAlign: 'center',
        flexShrink: 0
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: '#FFCC00', borderRadius: 10, padding: '8px 28px',
          marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
        }}>
          <span style={{
            color: '#D40511', fontWeight: 900, fontSize: 36,
            letterSpacing: 5, fontFamily: 'Arial Black, sans-serif'
          }}>DHL</span>
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.95)', margin: 0,
          fontSize: 13, fontWeight: 600, letterSpacing: 2
        }}>
          KNOWLEDGE BASE SYSTEM
        </p>
      </div>

      {/* ── Form area — full width, centered content ── */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 20px',
        boxSizing: 'border-box'
      }}>

        {/* Inner form container — max width for readability */}
        <div style={{ width: '100%', maxWidth: 480 }}>

          {/* Tab switcher */}
          <div style={{
            display: 'flex', marginBottom: 28,
            background: '#f3f4f6', borderRadius: 10, padding: 4
          }}>
            {['login', 'signup'].map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '10px', border: 'none', borderRadius: 8,
                  cursor: 'pointer', fontWeight: 700, fontSize: 14,
                  transition: 'all 0.2s',
                  background: mode === m ? 'white' : 'transparent',
                  color: mode === m ? '#D40511' : '#9ca3af',
                  boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                }}>
                {m === 'login' ? '🔐 Login' : '✏️ Sign Up'}
              </button>
            ))}
          </div>

          {/* Messages */}
          {error && (
            <div style={{
              background: '#fef2f2', color: '#dc2626',
              padding: '11px 16px', borderRadius: 8, marginBottom: 20,
              fontSize: 14, border: '1px solid #fecaca',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{
              background: '#f0fdf4', color: '#16a34a',
              padding: '11px 16px', borderRadius: 8, marginBottom: 20,
              fontSize: 14, border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>Full Name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Chua Hwen Wei" style={inputStyle} />
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" style={inputStyle} />
            </div>

            <div style={{ marginBottom: mode === 'signup' ? 18 : 28 }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters" style={inputStyle} />
            </div>

            {mode === 'signup' && (
              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
                  <option value="editor">✏️ Editor — create & edit drafts</option>
                  <option value="reviewer">👁️ Reviewer — mark as reviewed</option>
                  <option value="admin">⚙️ Admin — full access</option>
                </select>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#ccc' : 'linear-gradient(135deg, #D40511, #ff2020)',
                color: 'white', border: 'none', borderRadius: 10,
                fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700, letterSpacing: 0.5,
                boxShadow: loading ? 'none' : '0 4px 20px rgba(212,5,17,0.35)',
                transition: 'all 0.2s'
              }}>
              {loading ? '⏳ Please wait...' : (mode === 'login' ? 'Login →' : 'Create Account →')}
            </button>
          </form>

          <div style={{
            textAlign: 'center', marginTop: 28,
            paddingTop: 20, borderTop: '1px solid #f3f4f6'
          }}>
            <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>
              DHL Logistics Operations · Internal Tool
            </p>
            <p style={{ color: '#d1d5db', fontSize: 11, margin: '4px 0 0' }}>
              © 2026 DHL Express. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}