/**
 * CodeAtlas Web — WikiContentView Component
 *
 * Full-width, scrollable wiki page renderer used when a wiki page tab is
 * active in the WikiGraph view.  Fetches content from /api/wiki/page/:slug
 * and renders it with rich typography.
 *
 * Wiki links [[slug]] are clickable and fire onOpenPage to open a new tab.
 *
 * Sprint 22 — Wiki UI refactor
 */

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  type MouseEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { fetchWikiPage } from '../api/wiki';
import { getAIJob } from '../api/graph';
import { THEME } from '../styles/theme';
import type { WikiPageDetail, WikiNodeType } from '../types/wiki';

// ---------------------------------------------------------------------------
// Shared markdown renderer — rich typography version
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders Markdown to HTML with rich typography.
 * Handles: headings (h1-h3), bold/italic, code blocks, lists, wiki-links,
 * and a special "概述/Overview" summary block.
 */
export function renderSimpleMarkdown(md: string): string {
  // Strip YAML frontmatter and HTML comments
  let text = md
    .replace(/^---[\s\S]*?---\n/, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Code blocks (``` ... ```) — protect from other transforms
  const codeBlocks: string[] = [];
  text = text.replace(/```[\w]*\n[\s\S]*?```/g, (block) => {
    const inner = block.replace(/^```[^\n]*\n/, '').replace(/\n?```$/, '');
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    codeBlocks.push(
      `<pre style="background:#1e1e2e;color:#cdd6f4;border-radius:8px;padding:16px 20px;overflow-x:auto;font-family:${THEME.fontMono};font-size:13px;line-height:1.6;margin:16px 0;border:1px solid ${THEME.borderDefault}"><code>${escapeHtml(inner.trimEnd())}</code></pre>`,
    );
    return placeholder;
  });

  // Inline code
  text = text.replace(
    /`([^`]+)`/g,
    `<code style="background:rgba(0,0,0,0.06);padding:2px 6px;border-radius:4px;font-family:${THEME.fontMono};font-size:0.9em;color:#c7254e">$1</code>`,
  );

  // Bold + italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#1a1a2e">$1</strong>');
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Wiki-links [[slug|name]] and [[slug]]
  text = text.replace(
    /\[\[([^\]|]+)\|([^\]]+)\]\]/g,
    '<a class="wp-wiki-link" data-slug="$1" href="#" style="color:#1976d2;text-decoration:none;border-bottom:1px solid rgba(25,118,210,0.3);cursor:pointer;font-weight:500">$2</a>',
  );
  text = text.replace(
    /\[\[([^\]]+)\]\]/g,
    '<a class="wp-wiki-link" data-slug="$1" href="#" style="color:#1976d2;text-decoration:none;border-bottom:1px solid rgba(25,118,210,0.3);cursor:pointer;font-weight:500">$1</a>',
  );

  // Process line by line for structured output
  const lines = text.split('\n');
  const outputParts: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const content = paragraphBuffer.join(' ').trim();
      if (content) {
        outputParts.push(`<p style="margin:0 0 16px;line-height:1.8;color:${THEME.inkSecondary};font-size:14px">${content}</p>`);
      }
      paragraphBuffer = [];
    }
  };

  const closeList = () => {
    if (inList) {
      outputParts.push(listType === 'ol' ? '</ol>' : '</ul>');
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    // Code block placeholder
    if (trimmed.startsWith('__CODE_BLOCK_')) {
      flushParagraph();
      closeList();
      const idx = parseInt(trimmed.replace('__CODE_BLOCK_', '').replace('__', ''), 10);
      if (codeBlocks[idx]) outputParts.push(codeBlocks[idx]!);
      continue;
    }

    // H1
    const h1Match = trimmed.match(/^# (.+)$/);
    if (h1Match) {
      flushParagraph();
      closeList();
      outputParts.push(`<h1 style="font-size:26px;font-weight:700;color:${THEME.inkPrimary};margin:32px 0 16px;line-height:1.3;letter-spacing:-0.02em">${h1Match[1]}</h1>`);
      continue;
    }

    // H2
    const h2Match = trimmed.match(/^## (.+)$/);
    if (h2Match) {
      flushParagraph();
      closeList();
      outputParts.push(`<h2 style="font-size:20px;font-weight:600;color:${THEME.inkPrimary};margin:36px 0 12px;padding-bottom:8px;border-bottom:2px solid ${THEME.borderDefault};line-height:1.4">${h2Match[1]}</h2>`);
      continue;
    }

    // H3
    const h3Match = trimmed.match(/^### (.+)$/);
    if (h3Match) {
      flushParagraph();
      closeList();
      outputParts.push(`<h3 style="font-size:16px;font-weight:600;color:${THEME.inkPrimary};margin:24px 0 8px;line-height:1.4">${h3Match[1]}</h3>`);
      continue;
    }

    // Unordered list item
    const ulMatch = trimmed.match(/^[-*] (.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (!inList || listType !== 'ul') {
        closeList();
        outputParts.push('<ul style="margin:8px 0 16px;padding-left:24px;list-style:disc">');
        inList = true;
        listType = 'ul';
      }
      outputParts.push(`<li style="margin:6px 0;line-height:1.7;color:${THEME.inkSecondary};font-size:14px">${ulMatch[1]}</li>`);
      continue;
    }

    // Ordered list item
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (!inList || listType !== 'ol') {
        closeList();
        outputParts.push('<ol style="margin:8px 0 16px;padding-left:24px;list-style:decimal">');
        inList = true;
        listType = 'ol';
      }
      outputParts.push(`<li style="margin:8px 0;line-height:1.7;color:${THEME.inkSecondary};font-size:14px;padding-left:4px">${olMatch[2]}</li>`);
      continue;
    }

    // Regular text → accumulate into paragraph
    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  closeList();

  let html = outputParts.join('\n');

  // Restore code blocks that might still be in text
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, block);
  });

  return html;
}

/**
 * Extract the "概述" / "Overview" section from markdown for the summary card.
 * Returns [summaryText, remainingMarkdown].
 */
function extractOverview(md: string): [string | null, string] {
  // Strip frontmatter first
  let text = md.replace(/^---[\s\S]*?---\n/, '');

  // Look for ## 概述 or ## Overview section
  const overviewPattern = /^##\s+(概述|Overview)\s*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/m;
  const match = text.match(overviewPattern);

  if (match) {
    const summary = match[2]!.trim();
    // Remove the overview section from the remaining text
    text = text.replace(overviewPattern, '').trim();
    return [summary, text];
  }

  return [null, text];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AI_POLL_INTERVAL_MS = 2000;

const TYPE_ICONS: Record<WikiNodeType, string> = {
  architecture: '\u{1F3D7}\uFE0F',
  pattern: '\u{1F504}',
  feature: '\u{26A1}',
  integration: '\u{1F517}',
  concept: '\u{1F4A1}',
};

const TYPE_COLORS: Record<WikiNodeType, { bg: string; border: string; text: string; badge: string }> = {
  architecture: { bg: 'rgba(21,101,192,0.06)', border: '#1565c0', text: '#1565c0', badge: 'rgba(21,101,192,0.12)' },
  pattern:      { bg: 'rgba(123,31,162,0.06)', border: '#7b1fa2', text: '#7b1fa2', badge: 'rgba(123,31,162,0.12)' },
  feature:      { bg: 'rgba(46,125,50,0.06)',  border: '#2e7d32', text: '#2e7d32', badge: 'rgba(46,125,50,0.12)' },
  integration:  { bg: 'rgba(245,158,11,0.06)', border: '#b45309', text: '#b45309', badge: 'rgba(245,158,11,0.12)' },
  concept:      { bg: 'rgba(0,131,143,0.06)',  border: '#00838f', text: '#00838f', badge: 'rgba(0,131,143,0.12)' },
};

type AiStatus = 'idle' | 'analyzing' | 'succeeded' | 'failed';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WikiContentViewProps {
  slug: string;
  onOpenPage: (slug: string, displayName: string) => void;
  /** Navigate to a source file in SF perspective */
  onNavigateToFile?: (filePath: string) => void;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton() {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }} aria-label={t('wiki.loading')}>
      {[80, 100, 60, 100, 45, 90, 100, 70].map((pct, i) => (
        <div
          key={i}
          style={{
            height: i === 0 ? 28 : 14,
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #f0f0f4 25%, #e8e8f0 50%, #f0f0f4 75%)',
            backgroundSize: '200% 100%',
            borderRadius: 4,
            animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.07}s`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WikiContentView({ slug, onOpenPage, onNavigateToFile }: WikiContentViewProps) {
  const { t } = useTranslation();

  const [page, setPage] = useState<WikiPageDetail | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AiStatus>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch page
  useEffect(() => {
    let cancelled = false;
    setPage(null);
    setFetchError(null);
    setAiStatus('idle');
    setAiError(null);
    setIsFetching(true);

    fetchWikiPage(slug)
      .then((detail) => {
        if (cancelled) return;
        if (detail === null) {
          setFetchError(t('wiki.loadError'));
        } else {
          setPage(detail);
        }
        setIsFetching(false);
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError(t('wiki.networkError'));
          setIsFetching(false);
        }
      });

    return () => { cancelled = true; };
  }, [slug, t]);

  // AI polling
  const clearPoll = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollJob = useCallback(
    (jobId: string) => {
      clearPoll();
      pollTimerRef.current = setTimeout(async () => {
        try {
          const res = await getAIJob(jobId);
          const status = res.job.status;
          if (status === 'succeeded' || status === 'cached') {
            setAiStatus('succeeded');
            const updated = await fetchWikiPage(slug);
            if (updated) setPage(updated);
          } else if (status === 'failed' || status === 'canceled') {
            setAiStatus('failed');
            setAiError(t('wiki.aiAnalysisFailed'));
          } else {
            setAiStatus('analyzing');
            pollJob(jobId);
          }
        } catch {
          setAiStatus('failed');
          setAiError(t('wiki.aiAnalysisError'));
        }
      }, AI_POLL_INTERVAL_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearPoll, slug],
  );

  useEffect(() => () => clearPoll(), [clearPoll]);

  const handleAiAnalyze = useCallback(async () => {
    if (aiStatus === 'analyzing') return;
    setAiStatus('analyzing');
    setAiError(null);
    try {
      const res = await fetch('/api/wiki/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        setAiStatus('failed');
        setAiError(t('wiki.serverError', { status: res.status }));
        return;
      }
      let data: { jobId?: string };
      try {
        data = await res.json() as { jobId?: string };
      } catch {
        setAiStatus('failed');
        setAiError(t('wiki.parseError'));
        return;
      }
      if (!data.jobId) {
        setAiStatus('failed');
        setAiError(t('wiki.noJobId'));
        return;
      }
      pollJob(data.jobId);
    } catch {
      setAiStatus('failed');
      setAiError(t('wiki.requestFailed'));
    }
  }, [aiStatus, slug, pollJob, t]);

  // Wiki-link click
  const handleContentClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('wp-wiki-link')) {
        e.preventDefault();
        const linkSlug = target.getAttribute('data-slug');
        const linkName = target.textContent ?? linkSlug ?? '';
        if (linkSlug) onOpenPage(linkSlug, linkName);
      }
    },
    [onOpenPage],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isFetching) {
    return (
      <div style={rootStyle}>
        <div style={scrollStyle}>
          <div style={wrapStyle}><Skeleton /></div>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={rootStyle}>
        <div style={scrollStyle}>
          <div style={wrapStyle}>
            <p style={{ fontSize: 14, color: '#c62828' }}>{fetchError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!page) return null;

  const typeColor = TYPE_COLORS[page.type] ?? TYPE_COLORS.concept;
  const [overview, remaining] = extractOverview(page.content);
  const contentHtml = renderSimpleMarkdown(remaining);

  return (
    <div style={rootStyle}>
      <div style={scrollStyle}>
        <div style={wrapStyle}>

          {/* ── Title row: title left, AI button right ── */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            marginBottom: 20,
          }}>
            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              color: THEME.inkPrimary,
              margin: 0,
              lineHeight: 1.3,
              letterSpacing: '-0.02em',
              fontFamily: THEME.fontUi,
              flex: 1,
              minWidth: 0,
            }}>
              {page.displayName}
            </h1>

            {/* AI button — idle / failed → show CTA; analyzing → spinner; succeeded → re-analyze */}
            {aiStatus === 'analyzing' ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                borderRadius: 8,
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.2)',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 14,
                  height: 14,
                  border: '2px solid rgba(245,158,11,0.25)',
                  borderTopColor: '#f59e0b',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} />
                <span style={{ fontSize: 12, color: THEME.inkMuted, whiteSpace: 'nowrap' as const }}>{t('wiki.aiAnalyzing')}</span>
              </div>
            ) : (aiStatus === 'succeeded' || page.hasAiContent) ? (
              <button
                type="button"
                onClick={() => { setAiStatus('idle'); }}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(245,158,11,0.3)',
                  background: 'rgba(245,158,11,0.06)',
                  color: '#b45309',
                  cursor: 'pointer',
                  fontFamily: THEME.fontUi,
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0,
                }}
              >
                ✨ {t('wiki.reanalyze')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { void handleAiAnalyze(); }}
                disabled={isFetching}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: '1px solid rgba(245,158,11,0.5)',
                  background: 'rgba(245,158,11,0.08)',
                  color: '#b45309',
                  cursor: 'pointer',
                  fontFamily: THEME.fontUi,
                  whiteSpace: 'nowrap' as const,
                  flexShrink: 0,
                }}
              >
                ✨ {t('wiki.startAnalysis')}
              </button>
            )}
          </div>

          {/* AI error message */}
          {aiStatus === 'failed' && aiError && (
            <p style={{ fontSize: 12, color: '#c62828', margin: '0 0 12px' }}>{aiError}</p>
          )}

          {/* ── Overview card ── */}
          {overview && (
            <div style={{
              background: typeColor.bg,
              borderLeft: `4px solid ${typeColor.border}`,
              borderRadius: '0 8px 8px 0',
              padding: '20px 24px',
              marginBottom: 32,
            }}>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                color: typeColor.text,
                marginBottom: 8,
                opacity: 0.8,
              }}>
                {t('wiki.overview')}
              </div>
              <div style={{
                fontSize: 15,
                lineHeight: 1.8,
                color: THEME.inkPrimary,
                fontWeight: 400,
              }}>
                {overview}
              </div>
            </div>
          )}

          {/* ── Main content ── */}
          <div
            onClick={handleContentClick}
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: contentHtml }}
            style={{ marginBottom: 32 }}
          />

          {/* ── Source files ── */}
          {page.sourceFiles && page.sourceFiles.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{
                fontSize: 14,
                fontWeight: 600,
                color: THEME.inkMuted,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                marginBottom: 12,
              }}>
                {t('wiki.relatedSources')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {page.sourceFiles.map((f) => (
                  <div
                    key={f}
                    onClick={() => onNavigateToFile?.(f)}
                    style={{
                      fontSize: 13,
                      color: onNavigateToFile ? '#1565c0' : THEME.inkSecondary,
                      fontFamily: THEME.fontMono,
                      padding: '6px 12px',
                      background: 'rgba(0,0,0,0.02)',
                      borderRadius: 6,
                      border: `1px solid ${THEME.borderDefault}`,
                      cursor: onNavigateToFile ? 'pointer' : 'default',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (onNavigateToFile) (e.currentTarget).style.background = 'rgba(21,101,192,0.06)'; }}
                    onMouseLeave={(e) => { (e.currentTarget).style.background = 'rgba(0,0,0,0.02)'; }}
                  >
                    📄 {f}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root styles
// ---------------------------------------------------------------------------

const rootStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  background: '#fefefe',
  overflow: 'hidden',
};

const scrollStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const wrapStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 960,
  padding: '32px 40px 80px',
  fontFamily: THEME.fontUi,
};
