/**
 * Fixture: basic-functions.ts
 * Contains various function definition types for function-extractor testing.
 */

// Regular function declaration
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// Async function
async function fetchData(url: string): Promise<string> {
  return url;
}

// Generator function
function* generateIds(): Generator<number> {
  let id = 0;
  while (true) {
    yield id++;
  }
}

// Arrow function assigned to const
const multiply = (a: number, b: number): number => a * b;

// Exported function
export function formatDate(date: Date): string {
  return date.toISOString();
}

// Async arrow function
const delay = async (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
