/**
 * Fixture: nested-functions.ts
 * Top-level function containing inner functions.
 * Only the top-level function should be extracted.
 */

export function outerFunction(data: string[]): string[] {
  // Inner function — should NOT appear in extraction results
  function innerFilter(item: string): boolean {
    return item.length > 0;
  }

  // Inner arrow function — should NOT appear in extraction results
  const innerTransform = (item: string): string => item.trim();

  return data.filter(innerFilter).map(innerTransform);
}

export function anotherTopLevel(): void {
  // Another nested function
  function deeplyNested(): number {
    return 42;
  }
  deeplyNested();
}
