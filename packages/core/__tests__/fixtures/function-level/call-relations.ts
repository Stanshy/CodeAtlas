/**
 * Fixture: call-relations.ts
 * Functions calling each other: direct calls, method calls, new expressions.
 */

class Logger {
  log(msg: string): void {
    // intentionally minimal
  }
}

function initialize(): void {
  const logger = new Logger();
  logger.log('init');
  process_data();
}

function process_data(): string {
  const result = transform('input');
  return result;
}

function transform(value: string): string {
  return value.toUpperCase();
}

export { initialize, process_data, transform };
