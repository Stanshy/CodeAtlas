/**
 * Fixture: cross-file-callee.ts
 * Exports named functions to be imported by cross-file-caller.ts.
 */

export function parseValue(input: string): number {
  return parseFloat(input);
}

export function formatResult(value: number): string {
  return value.toFixed(2);
}

export function validateInput(input: string): boolean {
  return input.trim().length > 0;
}
