/**
 * AI Provider — DisabledProvider
 *
 * Default no-op provider used when no API key is configured.
 * Returns a human-readable message instead of throwing.
 */

import type { SummaryContext } from '../types.js';
import { BaseAnalysisProvider } from './base-analysis-provider.js';

export class DisabledProvider extends BaseAnalysisProvider {
  name = 'disabled';

  isConfigured(): boolean {
    return false;
  }

  /** Disabled provider never supports analysis regardless of configuration */
  override supportsAnalysis(): boolean {
    return false;
  }

  async summarize(_code: string, _context: SummaryContext): Promise<string> {
    return 'AI summary not configured. Set an API key to enable.';
  }
}
