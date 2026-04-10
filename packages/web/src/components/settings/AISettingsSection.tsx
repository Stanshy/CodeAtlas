/**
 * CodeAtlas — AISettingsSection
 *
 * Extracted from SettingsPopover. Contains the AI configuration section:
 * - Provider select dropdown with recommendation badge
 * - Privacy badge (local vs cloud)
 * - API key input (conditional)
 * - Connection test button + status display
 * - Feature toggles (AI summary, role classification)
 * - Hidden method roles configuration
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
  const { aiProvider, aiApiKey, enableAiSummary, enableAiRoleClassification, hiddenMethodRoles } = state;

  // -----------------------------------------------------------------------
  // Recommended provider — fetch on mount
  // -----------------------------------------------------------------------

  const [recommendedProvider, setRecommendedProvider] = useState<'claude-code' | 'gemini' | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai/status')
      .then((r) => r.json())
      .then((data: { enabled: boolean; provider: string }) => {
        if (cancelled) return;
        if (data.provider === 'claude-code') {
          setRecommendedProvider('claude-code');
        } else {
          setRecommendedProvider('gemini');
        }
      })
      .catch(() => {
        if (!cancelled) setRecommendedProvider('gemini');
      });
    return () => { cancelled = true; };
  }, []);

  // -----------------------------------------------------------------------
  // Provider change
  // -----------------------------------------------------------------------

  const [isConfiguringProvider, setIsConfiguringProvider] = useState(false);

  const handleProviderChange = useCallback(
    async (newProvider: string) => {
      dispatch({ type: 'SET_AI_PROVIDER', provider: newProvider });
      if (isConfiguringProvider) return;
      setIsConfiguringProvider(true);
      try {
        const result = await postAIConfigure(newProvider, aiApiKey || undefined);
        if (result.ok) {
          if (result.persisted) {
            onShowToast(
              'success',
              t('ai.settingsSaved'),
              t('ai.settingsSavedDesc', { provider: result.provider }),
            );
          } else {
            onShowToast(
              'warning',
              t('ai.settingsApplied'),
              t('ai.settingsAppliedDesc'),
            );
          }
        } else {
          onShowToast('error', t('ai.settingsFailed'), t('ai.settingsFailedDesc'));
        }
      } catch {
        onShowToast('error', t('ai.settingsFailed'), t('ai.settingsFailedDesc'));
      } finally {
        setIsConfiguringProvider(false);
      }
    },
    [dispatch, isConfiguringProvider, onShowToast, aiApiKey],
  );

  // -----------------------------------------------------------------------
  // Sync API key to server (debounced)
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!aiApiKey || aiProvider === 'disabled') return;
    const timer = setTimeout(() => {
      void postAIConfigure(aiProvider, aiApiKey);
    }, 800);
    return () => clearTimeout(timer);
  }, [aiApiKey, aiProvider]);

  // -----------------------------------------------------------------------
  // Connection test
  // -----------------------------------------------------------------------

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string>('');

  // Reset test status when provider changes
  useEffect(() => {
    setTestStatus('idle');
    setTestError('');
  }, [aiProvider]);

  const handleTestConnection = useCallback(async () => {
    if (aiProvider === 'disabled') {
      setTestStatus('success');
      setTestError('');
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
          provider: aiProvider,
          apiKey: aiApiKey,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        setTestStatus('error');
        setTestError(t('ai.testNeedsLatestCli'));
        return;
      }

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
  }, [aiProvider, aiApiKey]);

  // -----------------------------------------------------------------------
  // Derived state
  // -----------------------------------------------------------------------

  const isLocal = aiProvider === 'claude-code' || aiProvider === 'ollama';
  const isCloud = aiProvider === 'gemini' || aiProvider === 'openai' || aiProvider === 'anthropic';
  const needsApiKey = isCloud;
  const isDisabled = aiProvider === 'disabled';

  // -----------------------------------------------------------------------
  // Style constants
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

  const inputStyle: CSSProperties = { ...selectStyle };

  const toggleRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 0',
  };

  const toggleLabelStyle: CSSProperties = {
    fontSize: 12,
    color: isDisabled ? THEME.inkMuted : THEME.inkSecondary,
    fontFamily: THEME.fontUi,
    userSelect: 'none',
  };

  // -----------------------------------------------------------------------
  // Recommendation badge
  // -----------------------------------------------------------------------

  const recommendBadge = (providerValue: string) =>
    recommendedProvider === providerValue ? (
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 4,
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          color: '#f59e0b',
          whiteSpace: 'nowrap',
          fontFamily: THEME.fontUi,
        }}
      >
        ⭐ {t('ai.recommended')}
      </span>
    ) : null;

  // -----------------------------------------------------------------------
  // Sub-elements
  // -----------------------------------------------------------------------

  const privacyBadge = !isDisabled ? (
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
  ) : null;

  const apiKeyInput = (
    <div>
      <label style={labelStyle}>API Key</label>
      <input
        type="password"
        value={aiApiKey}
        onChange={(e) => dispatch({ type: 'SET_AI_API_KEY', apiKey: e.target.value })}
        placeholder="API Key"
        style={inputStyle}
        autoComplete="off"
      />
    </div>
  );

  const testButton = !isDisabled ? (
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
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.borderColor = THEME.sfAccent;
            btn.style.color = THEME.sfAccent;
          }
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = THEME.borderDefault;
          btn.style.color = THEME.inkSecondary;
        }}
      >
        {testStatus === 'testing' ? t('ai.testing') : t('ai.testConnection')}
      </button>
      <span
        style={{
          fontSize: 11,
          color: testStatus === 'success'
            ? '#2e7d32'
            : testStatus === 'error'
              ? '#c62828'
              : THEME.inkMuted,
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
  ) : null;

  const featureToggles = (
    <div>
      <label style={labelStyle}>{t('ai.features')}</label>
      <div style={toggleRowStyle}>
        <span style={toggleLabelStyle}>{t('ai.methodSummary')}</span>
        <input
          type="checkbox"
          checked={enableAiSummary}
          disabled={isDisabled}
          onChange={(e) => dispatch({ type: 'SET_ENABLE_AI_SUMMARY', enabled: e.target.checked })}
          style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', accentColor: THEME.sfAccent }}
          aria-label={t('ai.methodSummary')}
        />
      </div>
      <div style={toggleRowStyle}>
        <span style={toggleLabelStyle}>{t('ai.roleClassification')}</span>
        <input
          type="checkbox"
          checked={enableAiRoleClassification}
          disabled={isDisabled}
          onChange={(e) => dispatch({ type: 'SET_ENABLE_AI_ROLE_CLASSIFICATION', enabled: e.target.checked })}
          style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', accentColor: THEME.sfAccent }}
          aria-label={t('ai.roleClassification')}
        />
      </div>
    </div>
  );

  const ROLE_OPTIONS: Array<{ value: string; labelKey: string }> = [
    { value: 'utility', labelKey: 'ai.roleUtility' },
    { value: 'framework_glue', labelKey: 'ai.roleFrameworkGlue' },
    { value: 'infra', labelKey: 'ai.roleInfra' },
    { value: 'validation', labelKey: 'ai.roleValidation' },
    { value: 'io_adapter', labelKey: 'ai.roleIoAdapter' },
  ];

  const hiddenRolesSection = (
    <div>
      <label style={labelStyle}>{t('ai.loHiddenRoles')}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ROLE_OPTIONS.map((role) => (
          <label
            key={role.value}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: 12,
              color: THEME.inkSecondary,
              fontFamily: THEME.fontUi,
            }}
          >
            <input
              type="checkbox"
              checked={hiddenMethodRoles.includes(role.value)}
              onChange={() => dispatch({ type: 'TOGGLE_HIDDEN_METHOD_ROLE', role: role.value })}
              style={{ cursor: 'pointer', accentColor: THEME.sfAccent, flexShrink: 0 }}
            />
            <span>{role.value}</span>
            <span style={{ color: THEME.inkMuted, fontSize: 11 }}>({t(role.labelKey)})</span>
          </label>
        ))}
      </div>
    </div>
  );

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
            value={aiProvider}
            onChange={(e) => { void handleProviderChange(e.target.value); }}
            disabled={isConfiguringProvider}
            style={{
              ...selectStyle,
              flex: 1,
              opacity: isConfiguringProvider ? 0.7 : 1,
              cursor: isConfiguringProvider ? 'wait' : 'pointer',
            }}
          >
            <option value="anthropic">Claude (Anthropic)</option>
            <option value="claude-code">Claude Code CLI</option>
            <option value="gemini">Gemini (Google)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="ollama">{t('ai.ollamaLocal')}</option>
            <option value="disabled">{t('ai.disabled')}</option>
          </select>
          {recommendBadge(aiProvider)}
        </div>
      </div>

      {/* Privacy badge */}
      {privacyBadge}

      {/* API Key (conditional) */}
      {needsApiKey && apiKeyInput}

      {/* Test button */}
      {testButton}

      {/* Feature toggles */}
      {featureToggles}

      {/* Hidden roles */}
      {hiddenRolesSection}
    </div>
  );
});
