/**
 * CodeAtlas — AISettingsSection
 *
 * AI configuration section with a single "Save" button:
 * - Provider select dropdown
 * - API key input (for cloud providers)
 * - Save button — saves provider + key together
 * - Connection test button
 *
 * No auto-save. User must explicitly click Save.
 */

import { memo, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useViewState } from '../../contexts/ViewStateContext';
import { THEME } from '../../styles/theme';
import { postAIConfigure } from '../../api/graph';
import type { ToastItem } from '../Toast';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AISettingsSectionProps {
  onShowToast: (type: ToastItem['type'], title: string, description: string) => void;
}

// ---------------------------------------------------------------------------
// AISettingsSection
// ---------------------------------------------------------------------------

export const AISettingsSection = memo(function AISettingsSection({
  onShowToast,
}: AISettingsSectionProps) {
  const { t } = useTranslation();
  const { state, dispatch } = useViewState();

  // -----------------------------------------------------------------------
  // Local draft state — NOT synced to server until Save
  // -----------------------------------------------------------------------

  const [draftProvider, setDraftProvider] = useState(state.aiProvider || 'anthropic');
  const [draftApiKey, setDraftApiKey] = useState('');

  // Server-confirmed state: which provider has a key saved
  const [serverProvider, setServerProvider] = useState<string | null>(null);
  const [serverHasKey, setServerHasKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isDirty, setIsDirty] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch server status on mount
  // -----------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data: { provider: string; hasApiKey?: boolean }) => {
        if (cancelled) return;
        setServerProvider(data.provider);
        setServerHasKey(!!data.hasApiKey);
        setDraftProvider(data.provider);
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  // Track dirty state
  const handleProviderChange = useCallback((newProvider: string) => {
    setDraftProvider(newProvider);
    setIsDirty(true);
    setSaveStatus('idle');
  }, []);

  const handleKeyChange = useCallback((key: string) => {
    setDraftApiKey(key);
    setIsDirty(true);
    setSaveStatus('idle');
  }, []);

  // -----------------------------------------------------------------------
  // Save — provider + key together
  // -----------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const result = await postAIConfigure(
        draftProvider,
        draftApiKey.trim() || undefined,
      );
      if (result.ok) {
        setSaveStatus('saved');
        setIsDirty(false);
        setServerProvider(draftProvider);
        if (draftApiKey.trim()) {
          setServerHasKey(true);
        }
        setDraftApiKey('');
        dispatch({ type: 'SET_AI_PROVIDER', provider: draftProvider });
        onShowToast('success', t('ai.settingsSaved'), t('ai.settingsSavedDesc', { provider: draftProvider }));
      } else {
        setSaveStatus('error');
        onShowToast('error', t('ai.settingsFailed'), t('ai.settingsFailedDesc'));
      }
    } catch {
      setSaveStatus('error');
      onShowToast('error', t('ai.settingsFailed'), t('ai.settingsFailedDesc'));
    }
  }, [draftProvider, draftApiKey, dispatch, onShowToast, t]);

  // -----------------------------------------------------------------------
  // Connection test
  // -----------------------------------------------------------------------

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string>('');

  useEffect(() => {
    setTestStatus('idle');
    setTestError('');
  }, [draftProvider]);

  const handleTestConnection = useCallback(async () => {
    if (draftProvider === 'disabled') {
      setTestStatus('success');
      return;
    }

    setTestStatus('testing');
    setTestError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: draftProvider,
          ...(draftApiKey.trim() ? { apiKey: draftApiKey.trim() } : {}),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setTestStatus('error');
        setTestError(errorData?.message ?? t('ai.testConnectionFailed', { status: response.status }));
        return;
      }

      setTestStatus('success');
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setTestStatus('error');
        setTestError(t('ai.testTimeout'));
      } else {
        setTestStatus('error');
        setTestError(t('ai.testFailed'));
      }
    }
  }, [draftProvider, draftApiKey, t]);

  // -----------------------------------------------------------------------
  // Derived
  // -----------------------------------------------------------------------

  const isLocal = draftProvider === 'ollama';
  const isCloud = draftProvider === 'gemini' || draftProvider === 'openai' || draftProvider === 'anthropic';
  const needsApiKey = isCloud;
  const isDisabled = draftProvider === 'disabled';

  // Key status: only show "configured" when the CURRENT draft provider matches server provider
  const currentProviderHasKey = serverHasKey && serverProvider === draftProvider;

  // -----------------------------------------------------------------------
  // Styles
  // -----------------------------------------------------------------------

  const labelStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 500,
    color: THEME.inkMuted,
    marginBottom: 4,
    display: 'block',
  };

  const selectStyle: CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    fontSize: 12,
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: 6,
    background: '#fff',
    color: THEME.inkPrimary,
    fontFamily: THEME.fontUi,
    outline: 'none',
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div style={{ padding: '4px 14px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Provider Select */}
      <div>
        <label style={labelStyle}>{t('ai.provider')}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <select
            value={draftProvider}
            onChange={(e) => handleProviderChange(e.target.value)}
            style={{ ...selectStyle, flex: 1, cursor: 'pointer' }}
          >
            <option value="anthropic">Claude (Anthropic)</option>
            <option value="gemini">Gemini (Google)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="ollama">{t('ai.ollamaLocal')}</option>
            <option value="disabled">{t('ai.disabled')}</option>
          </select>
        </div>
      </div>

      {/* Privacy badge */}
      {!isDisabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '3px 8px',
              borderRadius: 10,
              background: isLocal ? 'rgba(46, 125, 50, 0.08)' : 'rgba(21, 101, 192, 0.08)',
              border: `1px solid ${isLocal ? 'rgba(46, 125, 50, 0.25)' : 'rgba(21, 101, 192, 0.25)'}`,
              color: isLocal ? '#2e7d32' : '#1565c0',
              fontFamily: THEME.fontUi,
            }}
          >
            {isLocal ? `🔒 ${t('ai.localProcessing')}` : `☁️ ${t('ai.cloudService')}`}
          </span>
        </div>
      )}

      {/* API Key */}
      {needsApiKey && (
        <div>
          <label style={labelStyle}>API Key</label>
          {currentProviderHasKey && (
            <div style={{ marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '3px 8px',
                  borderRadius: 10,
                  background: 'rgba(46, 125, 50, 0.08)',
                  border: '1px solid rgba(46, 125, 50, 0.25)',
                  color: '#2e7d32',
                  fontFamily: THEME.fontUi,
                }}
              >
                ✓ {t('ai.keyConfigured')}
              </span>
            </div>
          )}
          <input
            type="text"
            value={draftApiKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            placeholder={currentProviderHasKey ? t('ai.keyReplace') : t('ai.keyEnter')}
            style={{ ...selectStyle, fontFamily: "'Inter', monospace", letterSpacing: '0.05em', WebkitTextSecurity: 'disc' } as React.CSSProperties}
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
          />
        </div>
      )}

      {/* Save button — always visible */}
      <button
        onClick={handleSave}
        disabled={saveStatus === 'saving' || (!isDirty && saveStatus !== 'idle')}
        style={{
          width: '100%',
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: THEME.fontUi,
          background: isDirty ? '#1976d2' : saveStatus === 'saved' ? '#2e7d32' : '#e0e0e0',
          color: isDirty || saveStatus === 'saved' ? '#fff' : '#9e9e9e',
          border: 'none',
          borderRadius: 6,
          cursor: isDirty ? 'pointer' : saveStatus === 'saving' ? 'wait' : 'default',
          transition: 'all 0.15s',
          opacity: saveStatus === 'saving' ? 0.6 : 1,
        }}
      >
        {saveStatus === 'saving'
          ? '...'
          : saveStatus === 'saved' && !isDirty
            ? `✓ ${t('ai.settingsSaved')}`
            : t('ai.saveKey')}
      </button>

      {/* Test connection */}
      {!isDisabled && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleTestConnection}
            disabled={testStatus === 'testing'}
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 500,
              fontFamily: THEME.fontUi,
              background: 'none',
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: 6,
              cursor: testStatus === 'testing' ? 'not-allowed' : 'pointer',
              color: THEME.inkSecondary,
              transition: 'border-color 0.15s ease-out, color 0.15s ease-out',
              flexShrink: 0,
              opacity: testStatus === 'testing' ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              if (testStatus !== 'testing') {
                (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.sfAccent;
                (e.currentTarget as HTMLButtonElement).style.color = THEME.sfAccent;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.borderDefault;
              (e.currentTarget as HTMLButtonElement).style.color = THEME.inkSecondary;
            }}
          >
            {testStatus === 'testing' ? t('ai.testing') : t('ai.testConnection')}
          </button>
          <span
            style={{
              fontSize: 11,
              color: testStatus === 'success' ? '#2e7d32' : testStatus === 'error' ? '#c62828' : THEME.inkMuted,
              fontFamily: THEME.fontUi,
              fontStyle: testStatus === 'idle' ? 'italic' : 'normal',
              fontWeight: testStatus === 'success' || testStatus === 'error' ? 500 : 400,
            }}
          >
            {testStatus === 'idle' && t('ai.notTested')}
            {testStatus === 'testing' && t('ai.connectionTesting')}
            {testStatus === 'success' && `✓ ${t('ai.connectionSuccess')}`}
            {testStatus === 'error' && `✗ ${testError}`}
          </span>
        </div>
      )}
    </div>
  );
});
