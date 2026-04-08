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
        const result = await postAIConfigure(newProvider);
        if (result.ok) {
          if (result.persisted) {
            onShowToast(
              'success',
              '設定已儲存',
              `AI Provider 已切換至 ${result.provider} · 已寫入 .codeatlas.json`,
            );
          } else {
            onShowToast(
              'warning',
              '設定已套用（本次有效）',
              '無法寫入設定檔，本次執行期間有效。請檢查 .codeatlas.json 權限。',
            );
          }
        } else {
          onShowToast('error', '設定更新失敗', '無法連線至 API。請重新整理後再試。');
        }
      } catch {
        onShowToast('error', '設定更新失敗', '無法連線至 API。請重新整理後再試。');
      } finally {
        setIsConfiguringProvider(false);
      }
    },
    [dispatch, isConfiguringProvider, onShowToast],
  );

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
        setTestError('測試連線功能需要最新版 CLI');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setTestStatus('error');
        setTestError(errorData?.message ?? `連線失敗 (${response.status})`);
        return;
      }

      setTestStatus('success');
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        setTestStatus('error');
        setTestError('連線逾時，請確認服務是否運行');
      } else {
        setTestStatus('error');
        setTestError('連線失敗，請檢查設定');
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
        ⭐ 推薦
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
        {isLocal ? '🔒 本地處理' : '☁️ 雲端服務'}
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
        {testStatus === 'testing' ? '測試中...' : '測試連線'}
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
        {testStatus === 'idle' && '尚未測試'}
        {testStatus === 'testing' && '連線測試中...'}
        {testStatus === 'success' && '✓ 連線成功'}
        {testStatus === 'error' && `✗ ${testError}`}
      </span>
    </div>
  ) : null;

  const featureToggles = (
    <div>
      <label style={labelStyle}>AI 功能</label>
      <div style={toggleRowStyle}>
        <span style={toggleLabelStyle}>AI 方法摘要</span>
        <input
          type="checkbox"
          checked={enableAiSummary}
          disabled={isDisabled}
          onChange={(e) => dispatch({ type: 'SET_ENABLE_AI_SUMMARY', enabled: e.target.checked })}
          style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', accentColor: THEME.sfAccent }}
          aria-label="AI 方法摘要"
        />
      </div>
      <div style={toggleRowStyle}>
        <span style={toggleLabelStyle}>AI 角色分類</span>
        <input
          type="checkbox"
          checked={enableAiRoleClassification}
          disabled={isDisabled}
          onChange={(e) => dispatch({ type: 'SET_ENABLE_AI_ROLE_CLASSIFICATION', enabled: e.target.checked })}
          style={{ cursor: isDisabled ? 'not-allowed' : 'pointer', accentColor: THEME.sfAccent }}
          aria-label="AI 角色分類"
        />
      </div>
    </div>
  );

  const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
    { value: 'utility', label: '工具函式' },
    { value: 'framework_glue', label: '框架膠水' },
    { value: 'infra', label: '基礎設施' },
    { value: 'validation', label: '輸入驗證' },
    { value: 'io_adapter', label: 'I/O 轉接' },
  ];

  const hiddenRolesSection = (
    <div>
      <label style={labelStyle}>LO 視角隱藏角色</label>
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
            <span style={{ color: THEME.inkMuted, fontSize: 11 }}>({role.label})</span>
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
        <label style={labelStyle}>AI 提供者</label>
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
            <option value="claude-code">Claude Code CLI (本地)</option>
            <option value="gemini">Gemini (Google)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="ollama">Ollama (本地)</option>
            <option value="disabled">停用</option>
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
