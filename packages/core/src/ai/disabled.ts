/**
 * AI Provider — DisabledProvider
 *
 * Default no-op provider used when no API key is configured.
 * Returns a human-readable message instead of throwing.
 */

import type { SummaryProvider, SummaryContext } from './types.js';

export class DisabledProvider implements SummaryProvider {
  name = 'disabled';

  isConfigured(): boolean {
    return false;
  }

  async summarize(_code: string, _context: SummaryContext): Promise<string> {
    return 'AI summary not configured. Set an API key to enable.';
  }
}
