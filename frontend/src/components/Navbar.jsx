import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;
  const logout = () => { localStorage.clear(); navigate('/login'); };

  const isActive = (path) => location.pathname.startsWith(path);

  const linkStyle = (path) => ({
    color: isActive(path) ? '#FFCC00' : 'rgba(255,255,255,0.85)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: isActive(path) ? 700 : 500,
    padding: '6px 12px',
    borderRadius: 6,
    transition: 'all 0.2s',
    borderBottom: isActive(path) ? '2px solid #FFCC00' : '2px solid transparent'
  });

  const [hoveredLink, setHoveredLink] = useState(null);
  const [logoutHovered, setLogoutHovered] = useState(false);

  const navLinks = [
    { to: '/dashboard', label: '🏠 Dashboard', roles: ['admin', 'editor', 'reviewer'] },
    { to: '/upload', label: '📤 Upload', roles: ['admin', 'editor'] },
    { to: '/viewer', label: '📋 All Articles', roles: ['admin', 'editor', 'reviewer'] },
  ].filter(l => l.roles.includes(role));

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #D40511, #b00010)',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 60,
      boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>

      {/* Left — Logo + Links */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

        {/* DHL Logo */}
        <div
          onClick={() => navigate('/dashboard')}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: '#FFCC00', borderRadius: 6, padding: '4px 14px',
            cursor: 'pointer', marginRight: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.06)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
          }}
        >
          <span style={{
            color: '#D40511', fontWeight: 900, fontSize: 20,
            letterSpacing: 3, fontFamily: 'Arial Black, sans-serif'
          }}>DHL</span>
        </div>

        {/* Nav Links */}
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              ...linkStyle(link.to),
              background: hoveredLink === link.to
                ? 'rgba(255,255,255,0.15)'
                : isActive(link.to)
                  ? 'rgba(255,204,0,0.15)'
                  : 'transparent'
            }}
            onMouseEnter={() => setHoveredLink(link.to)}
            onMouseLeave={() => setHoveredLink(null)}
          >
            {link.label}
          </Link>
        ))}
      </div>

      {/* Right — User info + Logout */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>

        {/* User badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 20, padding: '5px 14px'
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#FFCC00', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 12, color: '#D40511'
          }}>
            {(user.full_name || user.email || 'U')[0].toUpperCase()}
          </div>
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>
              {user.full_name || user.email}
            </div>
            <div style={{ color: '#FFCC00', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
              {role}
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          onMouseEnter={() => setLogoutHovered(true)}
          onMouseLeave={() => setLogoutHovered(false)}
          style={{
            background: logoutHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white', padding: '7px 16px',
            borderRadius: 8, cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            transition: 'all 0.2s'
          }}>
          Logout →
        </button>
      </div>
    </nav>
  );
}