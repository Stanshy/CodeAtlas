/**
 * Fixture: cross-file-caller.ts
 * Imports functions from cross-file-callee.ts and calls them.
 */

import { parseValue, formatResult, validateInput } from './cross-file-callee';

export function processInput(raw: string): string {
  if (!validateInput(raw)) {
    return 'invalid';
  }
  const num = parseValue(raw);
  return formatResult(num);
}
