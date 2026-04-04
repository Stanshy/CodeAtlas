/**
 * Fixture: dynamic-calls.ts
 * Dynamic property access calls — should produce low-confidence or no edges.
 */

const handlers: Record<string, () => void> = {};

function registerHandler(name: string, fn: () => void): void {
  handlers[name] = fn;
}

function dispatch(method: string): void {
  // Dynamic: obj[method]() — unresolvable
  const handler = handlers[method];
  if (handler) {
    handler();
  }
}

function callDynamic(obj: Record<string, () => void>, key: string): void {
  // Computed member access call
  obj[key]();
}

export { registerHandler, dispatch, callDynamic };
