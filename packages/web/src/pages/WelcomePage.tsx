/**
 * CodeAtlas — WelcomePage
 *
 * Full-screen welcome page with:
 *   - CodeAtlas logo + tagline
 *   - ProjectInput (path + validate + analyze)
 *   - RecentProjects list
 *   - AI setup guidance section (when no provider configured)
 *   - Version footer
 *
 * Matches screenshots 01-04 exactly.
 * Sprint 20 — T10
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectInput } from '../components/ProjectInput';
import { RecentProjects } from '../components/RecentProjects';
import i18n from '../locales';

// ---------------------------------------------------------------------------
// Language Toggle
// ---------------------------------------------------------------------------

function LanguageToggle({ isDark }: { isDark: boolean }) {
  const { i18n: i18nHook } = useTranslation();
  const { t } = useTranslation();
  const current = i18nHook.language;

  const toggle = () => {
    const next = current === 'zh-TW' ? 'en' : 'zh-TW';
    void i18n.changeLanguage(next);
    localStorage.setItem('codeatlas-locale', next);
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    top: 16,
    right: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`,
    color: isDark ? '#a0a0c0' : '#6666aa',
    userSelect: 'none',
  };

  return (
    <button
      type="button"
      style={style}
      onClick={toggle}
      aria-label={t('welcome.languageToggleAriaLabel')}
    >
      🌐 {current === 'zh-TW' ? 'EN' : '中'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// AI Setup Block
// ---------------------------------------------------------------------------

interface AiSetupBlockProps {
  isDark: boolean;
  onDismiss?: () => void;
}

function AiSetupBlock({ isDark, onDismiss }: AiSetupBlockProps) {
  const { t } = useTranslation();
  const [provider, setProvider] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  const blockStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 480,
    borderRadius: 10,
    padding: '18px 20px',
    background: isDark ? 'rgba(59,130,246,0.06)' : 'rgba(21,101,192,0.04)',
    border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : 'rgba(21,101,192,0.15)'}`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: isDark ? '#e8e8f0' : '#1a1a2e',
  };

  const descStyle: React.CSSProperties = {
    fontSize: 13,
    marginBottom: 14,
    color: isDark ? '#a0a0c0' : '#4a4a6a',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap' as const,
  };

  const selectStyle: React.CSSProperties = {
    flex: 1,
    minWidth: 160,
    height: 36,
    padding: '0 10px',
    borderRadius: 6,
    fontSize: 13,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    background: isDark ? '#252540' : '#ffffff',
    border: `1px solid ${isDark ? '#3a3a5a' : '#d0d0d8'}`,
    color: isDark ? '#e8e8f0' : '#1a1a2e',
    outline: 'none',
  };

  const badgeRecommendStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 99,
    background: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.12)',
    color: isDark ? '#fbbf24' : '#d97706',
    border: `1px solid ${isDark ? 'rgba(245,158,11,0.35)' : 'rgba(245,158,11,0.3)'}`,
    whiteSpace: 'nowrap' as const,
  };

  const badgePrivateStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: 99,
    background: isDark ? 'rgba(46,125,50,0.12)' : 'rgba(46,125,50,0.08)',
    color: isDark ? '#4ade80' : '#2e7d32',
    border: `1px solid ${isDark ? 'rgba(46,125,50,0.3)' : 'rgba(46,125,50,0.2)'}`,
    whiteSpace: 'nowrap' as const,
  };

  const testBtnStyle: React.CSSProperties = {
    height: 34,
    padding: '0 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.12s',
    background: isDark ? 'rgba(59,130,246,0.15)' : '#e3f0fd',
    color: isDark ? '#60a5fa' : '#1565c0',
    border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : 'rgba(21,101,192,0.2)'}`,
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 12,
    borderTop: `1px solid ${isDark ? 'rgba(59,130,246,0.15)' : 'rgba(21,101,192,0.1)'}`,
  };

  const ghostBtnStyle: React.CSSProperties = {
    padding: '7px 14px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.12s',
    background: 'transparent',
    color: isDark ? '#6868aa' : '#8888aa',
    border: `1px solid ${isDark ? '#3a3a5a' : '#d0d0d8'}`,
  };

  const primaryBtnStyle: React.CSSProperties = {
    padding: '7px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
    background: '#1976d2',
    color: 'white',
    border: 'none',
    transition: 'all 0.12s',
  };

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const needsApiKey = provider === 'anthropic' || provider === 'gemini' || provider === 'openai';

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestError(null);
    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: apiKey || undefined }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const msg = (errorData as { message?: string })?.message ?? `Connection failed (${res.status})`;
        setTestStatus('error');
        setTestError(msg);
        return;
      }
      const data = await res.json();
      setTestStatus(data.ok ? 'success' : 'error');
      if (!data.ok) setTestError((data as { message?: string }).message ?? 'Connection failed');
    } catch {
      setTestStatus('error');
      setTestError('Network error — server unreachable');
    }
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/ai/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, ...(apiKey ? { apiKey } : {}) }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      // Hide AI setup block after successful save
      setTimeout(() => onDismiss?.(), 1200);
    } catch {
      setSaveStatus('error');
    }
  };

  const handleSkip = () => {
    onDismiss?.();
  };

  return (
    <div style={blockStyle}>
      <div style={titleStyle}>
        <span>✨</span>
        {t('welcome.setupAiTitle')}
      </div>
      <p style={descStyle}>
        {t('welcome.setupAiDesc')}
      </p>

      <div style={rowStyle}>
        <select
          style={selectStyle}
          value={provider}
          onChange={(e) => { setProvider(e.target.value); setTestStatus('idle'); setTestError(null); setSaveStatus('idle'); }}
          aria-label={t('welcome.selectAiProvider')}
        >
          <option value="anthropic">Claude (Anthropic)</option>
          <option value="claude-code">Claude Code CLI</option>
          <option value="gemini">Gemini (Google)</option>
          <option value="openai">OpenAI (GPT)</option>
          <option value="ollama">{t('welcome.ollamaLocal')}</option>
          <option value="disabled">{t('welcome.disabled')}</option>
        </select>

        {provider === 'ollama' && <span style={badgePrivateStyle}>🔒 {t('welcome.localProcessing')}</span>}
        {provider === 'anthropic' && <span style={badgeRecommendStyle}>⭐ {t('welcome.recommended')}</span>}
      </div>

      {/* API Key input — only for cloud providers */}
      {needsApiKey && (
        <div style={{ marginBottom: 10 }}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestStatus('idle'); setTestError(null); setSaveStatus('idle'); }}
            placeholder={t('welcome.enterApiKey')}
            aria-label="API Key"
            style={{
              ...selectStyle,
              flex: undefined,
              width: '100%',
              fontFamily: "'Inter', monospace",
              letterSpacing: '0.05em',
            }}
            autoComplete="off"
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          style={testBtnStyle}
          onClick={handleTestConnection}
          disabled={testStatus === 'testing' || (needsApiKey && !apiKey)}
        >
          {testStatus === 'testing' ? t('welcome.testing') : t('welcome.testConnection')}
        </button>
        {testStatus === 'success' && (
          <span style={{ fontSize: 12, color: isDark ? '#4ade80' : '#16a34a', fontWeight: 500 }}>
            ✓ {t('welcome.connectionSuccess')}
          </span>
        )}
        {testStatus === 'error' && (
          <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>
            ✗ {testError ?? 'Connection failed'}
          </span>
        )}
      </div>

      <div style={footerStyle}>
        <button type="button" style={ghostBtnStyle} onClick={handleSkip}>{t('welcome.skip')}</button>
        <button
          type="button"
          style={primaryBtnStyle}
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1565c0'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1976d2'; }}
        >
          {saveStatus === 'saving' ? t('welcome.saving') : saveStatus === 'saved' ? `✓ ${t('welcome.saved')}` : t('welcome.saveSettings')}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Logo Mark
// ---------------------------------------------------------------------------

function LogoMark() {
  return (
    <div
      style={{
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        background: 'linear-gradient(135deg, #1976d2 0%, #8b5cf6 100%)',
        borderRadius: 10,
        color: 'white',
        marginBottom: 4,
        boxShadow: '0 2px 8px rgba(25,118,210,0.3)',
        flexShrink: 0,
      }}
    >
      ◆
    </div>
  );
}

// ---------------------------------------------------------------------------
// WelcomePage
// ---------------------------------------------------------------------------

export function WelcomePage() {
  const { t } = useTranslation();
  // Welcome page uses light theme (white-paper style per G1 mockup).
  // The analysis page (graph view) remains dark.
  const isDark = false;

  // AI setup always visible on welcome page — users can adjust anytime
  const [showAiSetup, setShowAiSetup] = useState(true);

  // ── Styles ───────────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: isDark ? '#1a1a2e' : '#fafafa',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflowY: 'auto',
    padding: '48px 32px',
    gap: 32,
  };

  const logoAreaStyle: React.CSSProperties = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  };

  const logoNameStyle: React.CSSProperties = {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    color: isDark ? '#e8e8f0' : '#1a1a2e',
    margin: 0,
  };

  const logoSubStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 400,
    color: isDark ? '#6868aa' : '#8888aa',
    margin: 0,
  };

  const versionStyle: React.CSSProperties = {
    fontSize: 12,
    color: isDark ? 'rgba(104,104,170,0.6)' : '#bbbbcc',
    marginTop: 8,
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      {/* Language toggle — top-right corner */}
      <LanguageToggle isDark={isDark} />

      {/* Logo */}
      <div style={logoAreaStyle}>
        <LogoMark />
        <h1 style={logoNameStyle}>CodeAtlas</h1>
        <p style={logoSubStyle}>{t('welcome.tagline')}</p>
      </div>

      {/* Path input */}
      <ProjectInput isDark={isDark} />

      {/* Recent projects */}
      <RecentProjects isDark={isDark} />

      {/* AI setup guidance */}
      {showAiSetup && <AiSetupBlock isDark={isDark} onDismiss={() => setShowAiSetup(false)} />}

      {/* Version */}
      <p style={versionStyle}>{t('welcome.version', { version: '1.0.0' })}</p>
    </div>
  );
}
