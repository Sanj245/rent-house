import React, { useState } from 'react';
import { houseExists, saveHouseData } from '../db';

const ADJECTIVES = ['GREEN', 'GOLDEN', 'ROYAL', 'COZY', 'SWIFT', 'PRIME', 'AZURE', 'MISTY'];
const NOUNS      = ['NEST', 'HOME', 'VILLA', 'HAVEN', 'COURT', 'HOUSE', 'MANOR'];

function generateCode() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = Math.floor(Math.random() * 900) + 100;
  return `${adj}${noun}${num}`;
}

export default function HouseCodeScreen({ onComplete }) {
  const [mode, setMode]       = useState('join'); // 'create' | 'join'
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || trimmed.length < 4) {
      setError('House code must be at least 4 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'create') {
        const exists = await houseExists(trimmed);
        if (exists) {
          setError('This code is already taken. Try a different one, or switch to "Join House".');
          setLoading(false);
          return;
        }
        await saveHouseData(trimmed, { properties: [], tenants: [], ledger: {}, pastTenants: [] });
      } else {
        const exists = await houseExists(trimmed);
        if (!exists) {
          setError("This house code doesn't exist. Double-check the code.");
          setLoading(false);
          return;
        }
      }
      onComplete(trimmed);
    } catch (err) {
      console.error(err);
      setError('Connection error. Check your internet and try again.');
      setLoading(false);
    }
  };

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const tabBtn = (m) => ({
    flex: 1, padding: '10px 0', borderRadius: '9px', border: 'none', cursor: 'pointer',
    fontFamily: 'Outfit, sans-serif', fontWeight: '700', fontSize: '0.88rem',
    background: mode === m ? 'linear-gradient(135deg, #3d6a54, #4a8268)' : 'transparent',
    color: mode === m ? '#ffffff' : 'rgba(255,255,255,0.45)',
    boxShadow: mode === m ? '0 4px 12px rgba(61,106,84,0.35)' : 'none',
    transition: 'all 0.2s ease',
  });

  const inputStyle = {
    flex: 1, padding: '13px 16px',
    borderRadius: '11px',
    border: error ? '1.5px solid #f87171' : '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.25)',
    color: '#ffffff',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '1.05rem', fontWeight: '700', letterSpacing: '1.5px',
    outline: 'none', transition: 'border 0.2s',
    minWidth: 0,
  };

  const submitBtn = {
    width: '100%', padding: '14px',
    borderRadius: '12px', border: 'none',
    background: loading || !code.trim()
      ? 'rgba(61,106,84,0.35)'
      : 'linear-gradient(135deg, #3d6a54, #4a8268)',
    color: '#ffffff',
    fontFamily: 'Outfit, sans-serif',
    fontSize: '1rem', fontWeight: '700',
    cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
    boxShadow: loading || !code.trim() ? 'none' : '0 8px 24px rgba(61,106,84,0.45)',
    transition: 'all 0.2s ease', marginTop: '8px',
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%', maxWidth: '100%',
      background: 'radial-gradient(circle at 70% 20%, #3d6a54 0%, #1a2c22 45%, #0d1510 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Outfit, sans-serif', padding: '24px',
      boxSizing: 'border-box',
    }}>
      <div className="setup-card">

        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '2.4rem', fontWeight: '900', letterSpacing: '-1px', color: '#ffffff' }}>
            🏠 Rent<span style={{ color: '#d4a373' }}>Arc</span>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
            Real-time sync across all your devices
          </p>
        </div>

        {/* ── Mode Toggle ── */}
        <div style={{
          display: 'flex', background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px', padding: '4px', marginBottom: '28px', gap: '4px',
        }}>
          <button style={tabBtn('create')} onClick={() => { setMode('create'); setError(''); }}>
            🏗️ Create House
          </button>
          <button style={tabBtn('join')} onClick={() => { setMode('join'); setError(''); }}>
            🔗 Join House
          </button>
        </div>

        {/* ── Description ── */}
        <p style={{
          fontSize: '0.83rem', color: 'rgba(255,255,255,0.45)',
          marginBottom: '20px', lineHeight: '1.55',
        }}>
          {mode === 'create'
            ? 'Pick a unique house code. Share it with your family so everyone connects to the same live data.'
            : 'Enter the house code shared with you to join and sync with the existing data.'}
        </p>

        {/* ── Code Input ── */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block', fontSize: '0.75rem', fontWeight: '700',
            color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
            letterSpacing: '0.6px', marginBottom: '8px',
          }}>
            House Code
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              id="house-code-input"
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={mode === 'create' ? 'e.g. GOLDENEST101' : 'Enter code...'}
              maxLength={24}
              style={inputStyle}
              autoFocus
            />
            {mode === 'create' && (
              <button
                onClick={() => { setCode(generateCode()); setError(''); }}
                title="Generate a random code"
                className="dice-btn"
                style={{
                  padding: '12px 15px', borderRadius: '11px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(212,163,115,0.12)', color: '#d4a373',
                  cursor: 'pointer', fontSize: '1.2rem',
                }}
              >🎲</button>
            )}
          </div>
          {error && (
            <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ⚠️ {error}
            </p>
          )}
        </div>

        {/* ── Submit ── */}
        <button id="house-code-submit" style={submitBtn} onClick={handleSubmit} disabled={loading || !code.trim()}>
          {loading
            ? '⏳ Setting up...'
            : mode === 'create' ? '🚀 Create My House' : '🔗 Join House'}
        </button>

        {/* ── Footer note ── */}
        <p style={{
          fontSize: '0.73rem', color: 'rgba(255,255,255,0.25)',
          textAlign: 'center', marginTop: '24px', lineHeight: '1.5',
        }}>
          🔒 Only people who know your house code can access your data.
          <br />Data is securely stored in Firebase under your code.
        </p>
      </div>

      <style>{`
        .setup-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 44px 36px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.5);
          box-sizing: border-box;
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (max-width: 440px) {
          .setup-card {
            padding: 32px 20px;
          }
        }
        #house-code-input::placeholder { color: rgba(255,255,255,0.25); }
        #house-code-input:focus {
          border-color: rgba(61,106,84,0.8) !important;
          box-shadow: 0 0 0 3px rgba(61,106,84,0.2);
        }
        .dice-btn {
          flex-shrink: 0;
          transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dice-btn:hover {
          background: rgba(212,163,115,0.25) !important;
          transform: scale(1.08) rotate(15deg);
        }
        .dice-btn:active {
          transform: scale(0.95);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
