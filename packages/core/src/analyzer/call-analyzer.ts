/**
 * @codeatlas/core — Call Analyzer
 *
 * Sprint 7 / T4
 *
 * Analyzes call expressions in an AST to build function call relations.
 * Supports both tree-sitter and TypeScript Compiler API dialects.
 *
 * Two AST dialects are supported transparently:
 *   - tree-sitter: snake_case node types (call_expression, new_expression)
 *   - TS Compiler API: PascalCase (CallExpression, NewExpression)
 */

import type { AstNode } from '../parser/ast-provider.js';
import type { ParsedFunction } from '../parser/function-extractor.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CallRelation {
  callerFileId: string;
  callerName: string;
  calleeFileId: string;
  calleeName: string;
  callType: 'direct' | 'method' | 'new';
  confidence: 'high' | 'medium' | 'low';
  line: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Global / built-in names to skip — never create call edges for these. */
const SKIP_NAMES = new Set<string>([
  'console',
  'Math',
  'JSON',
  'Object',
  'Array',
  'Promise',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'parseInt',
  'parseFloat',
  'require',
  'process',
  'Buffer',
  'Error',
  'TypeError',
  'RangeError',
  'Symbol',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'String',
  'Number',
  'Boolean',
  'Date',
  'RegExp',
]);

// ---------------------------------------------------------------------------
// AST traversal helper
// ---------------------------------------------------------------------------

/** Recursively walk all descendants, calling visitor for each node. */
function walkAst(node: AstNode, visitor: (n: AstNode) => void): void {
  visitor(node);
  for (const child of node.children) {
    walkAst(child, visitor);
  }
}

// ---------------------------------------------------------------------------
// Name extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extract the callee name from a call_expression or CallExpression function child.
 * Returns { name, callType, isMethod, objectName } or null if unresolvable.
 */
interface CalleeInfo {
  name: string;
  callType: 'direct' | 'method' | 'new';
  isThisCall: boolean;
  objectName: string | null;
  isDynamic: boolean;
}

function extractTreeSitterCalleeInfo(callNode: AstNode, isNew: boolean): CalleeInfo | null {
  // For call_expression: first child is the function expression
  // For new_expression: first child after 'new' keyword is the constructor
  const funcChild = isNew
    ? callNode.children.find(
        (c) => c.type === 'identifier' || c.type === 'member_expression',
      )
    : callNode.children[0];

  if (!funcChild) return null;

  // Direct call: foo()
  if (funcChild.type === 'identifier') {
    if (SKIP_NAMES.has(funcChild.text)) return null;
    return {
      name: funcChild.text,
      callType: isNew ? 'new' : 'direct',
      isThisCall: false,
      objectName: null,
      isDynamic: false,
    };
  }

  // Method call: obj.foo() or this.foo()
  if (funcChild.type === 'member_expression') {
    const objectChild = funcChild.children[0];
    const propertyChild = funcChild.children.find(
      (c) => c.type === 'property_identifier' || c.type === 'identifier',
    );
    if (!propertyChild) return null;

    const objectName = objectChild?.text ?? null;
    const isThis = objectName === 'this';

    // Skip global object methods
    if (objectName && SKIP_NAMES.has(objectName)) return null;

    return {
      name: propertyChild.text,
      callType: isNew ? 'new' : 'method',
      isThisCall: isThis,
      objectName,
      isDynamic: false,
    };
  }

  // Dynamic call: obj[method]()
  if (funcChild.type === 'subscript_expression') {
    return {
      name: '',
      callType: 'method',
      isThisCall: false,
      objectName: null,
      isDynamic: true,
    };
  }

  return null;
}

function extractTsCalleeInfo(callNode: AstNode, isNew: boolean): CalleeInfo | null {
  // For CallExpression: first child is function expression
  // For NewExpression: children include 'new' keyword and the constructor expression
  const funcChild = isNew
    ? callNode.children.find(
        (c) => c.type === 'Identifier' || c.type === 'PropertyAccessExpression',
      )
    : callNode.children[0];

  if (!funcChild) return null;

  // Direct call: foo()
  if (funcChild.type === 'Identifier') {
    if (SKIP_NAMES.has(funcChild.text)) return null;
    return {
      name: funcChild.text,
      callType: isNew ? 'new' : 'direct',
      isThisCall: false,
      objectName: null,
      isDynamic: false,
    };
  }

  // Method call: obj.foo() or this.foo()
  if (funcChild.type === 'PropertyAccessExpression') {
    // PropertyAccessExpression children: [expression, dot, name]
    const objectChild = funcChild.children[0];
    const nameChild = funcChild.children.find(
      (c) => c.type === 'Identifier' && c !== objectChild,
    );
    if (!nameChild) return null;

    const objectName = objectChild?.text ?? null;
    const isThis = objectName === 'this';

    if (objectName && SKIP_NAMES.has(objectName)) return null;

    return {
      name: nameChild.text,
      callType: isNew ? 'new' : 'method',
      isThisCall: isThis,
      objectName,
      isDynamic: false,
    };
  }

  // Dynamic / subscript: obj[method]()
  if (funcChild.type === 'ElementAccessExpression') {
    return {
      name: '',
      callType: 'method',
      isThisCall: false,
      objectName: null,
      isDynamic: true,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Build a fast-lookup map from function name to ParsedFunction. */
function buildLocalFunctionMap(
  localFunctions: ParsedFunction[],
): Map<string, ParsedFunction> {
  const map = new Map<string, ParsedFunction>();
  for (const fn of localFunctions) {
    if (fn.className) {
      // method: key = ClassName.methodName
      map.set(`${fn.className}.${fn.name}`, fn);
    }
    // Always register plain name too for direct lookups
    if (!map.has(fn.name)) {
      map.set(fn.name, fn);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyze call relations in an AST for a given file.
 *
 * @param root              Root AstNode from any AstProvider
 * @param fileId            Relative file ID (e.g. "src/auth.ts")
 * @param localFunctions    ParsedFunction list from function-extractor for this file
 * @param importedFunctions Map from symbol name → { fileId, functionName }
 */
export function analyzeCallRelations(
  root: AstNode,
  fileId: string,
  localFunctions: ParsedFunction[],
  importedFunctions: Map<string, { fileId: string; functionName: string }>,
): CallRelation[] {
  const isTreeSitter = root.type === 'program' || root.type === 'source_file';
  const relations: CallRelation[] = [];
  const localMap = buildLocalFunctionMap(localFunctions);

  // Track current enclosing function/method for callerName
  // We use a simple heuristic: collect all call expressions and try to resolve them
  // The caller context is determined by which function node contains the call

  // Build a list of (functionId, startLine, endLine) for caller resolution
  interface FuncRange {
    name: string;
    startLine: number;
    endLine: number;
    className?: string;
  }
  const funcRanges: FuncRange[] = [];
  for (const fn of localFunctions) {
    funcRanges.push({
      name: fn.className ? `${fn.className}.${fn.name}` : fn.name,
      startLine: fn.startLine,
      endLine: fn.endLine,
    });
  }

  function getCallerName(line: number): string {
    // Find the most specific (narrowest) function range containing this line
    let best: FuncRange | null = null;
    for (const fr of funcRanges) {
      if (line >= fr.startLine && line <= fr.endLine) {
        if (!best || (fr.endLine - fr.startLine) < (best.endLine - best.startLine)) {
          best = fr;
        }
      }
    }
    return best?.name ?? '<module>';
  }

  const seenEdges = new Set<string>();

  walkAst(root, (node) => {
    const isCallExpr = isTreeSitter
      ? node.type === 'call_expression'
      : node.type === 'CallExpression';
    const isNewExpr = isTreeSitter
      ? node.type === 'new_expression'
      : node.type === 'NewExpression';

    if (!isCallExpr && !isNewExpr) return;

    const calleeInfo = isTreeSitter
      ? extractTreeSitterCalleeInfo(node, isNewExpr)
      : extractTsCalleeInfo(node, isNewExpr);

    if (!calleeInfo || calleeInfo.isDynamic) return;

    const { name: calleeName, callType, isThisCall } = calleeInfo;
    if (!calleeName) return;

    const line = node.startLine + 1;
    const callerName = getCallerName(node.startLine);

    // --- Lookup callee ---
    let targetFileId: string | null = null;
    let resolvedCalleeName: string = calleeName;
    let confidence: CallRelation['confidence'] = 'low';

    // 1. Direct call or this.method() → check local functions
    if (callType === 'direct' || isThisCall) {
      const localFn = localMap.get(calleeName);
      if (localFn) {
        targetFileId = fileId;
        resolvedCalleeName = localFn.className
          ? `${localFn.className}.${localFn.name}`
          : localFn.name;
        confidence = 'high';
      }
    }

    // 2. If not found locally, check imported functions
    if (!targetFileId) {
      const imported = importedFunctions.get(calleeName);
      if (imported) {
        targetFileId = imported.fileId;
        resolvedCalleeName = imported.functionName;
        confidence = callType === 'direct' ? 'high' : 'medium';
      }
    }

    // 3. Method call on non-this object: try imported
    if (!targetFileId && callType === 'method' && !isThisCall) {
      // Try looking up by calleeName alone in importedFunctions
      const imported = importedFunctions.get(calleeName);
      if (imported) {
        targetFileId = imported.fileId;
        resolvedCalleeName = imported.functionName;
        confidence = 'medium';
      } else {
        // Cannot resolve — skip
        return;
      }
    }

    // 4. new expression — check local (kind=class) then imported
    if (!targetFileId && callType === 'new') {
      const localFn = localMap.get(calleeName);
      if (localFn) {
        targetFileId = fileId;
        resolvedCalleeName = calleeName;
        confidence = 'high';
      } else {
        const imported = importedFunctions.get(calleeName);
        if (imported) {
          targetFileId = imported.fileId;
          resolvedCalleeName = imported.functionName;
          confidence = 'high';
        }
      }
    }

    if (!targetFileId) return;

    // Build caller ID and callee ID
    const callerId = `${fileId}#${callerName}`;
    const calleeId = `${targetFileId}#${resolvedCalleeName}`;

    // Deduplicate by edge key
    const edgeKey = `${callerId}--call--${calleeId}`;
    if (seenEdges.has(edgeKey)) return;
    seenEdges.add(edgeKey);

    relations.push({
      callerFileId: fileId,
      callerName,
      calleeFileId: targetFileId,
      calleeName: resolvedCalleeName,
      callType,
      confidence,
      line,
    });
  });

  return relations;
}
