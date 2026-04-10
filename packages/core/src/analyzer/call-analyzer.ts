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
import type { SupportedLanguage } from '../types.js';

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

/** Python built-in names to skip. */
const PYTHON_SKIP_NAMES = new Set<string>([
  'len', 'print', 'dict', 'list', 'range', 'type', 'isinstance',
  'str', 'int', 'float', 'bool', 'set', 'tuple', 'sorted',
  'enumerate', 'zip', 'map', 'filter', 'super', 'hasattr',
  'getattr', 'setattr', 'delattr', 'id', 'repr', 'abs',
  'min', 'max', 'sum', 'round', 'open', 'input', 'hex', 'oct',
  'bin', 'ord', 'chr', 'dir', 'vars', 'callable', 'iter', 'next',
  'property', 'staticmethod', 'classmethod',
]);

/** Java built-in names to skip. */
const JAVA_SKIP_NAMES = new Set<string>([
  'System', 'String', 'Integer', 'Long', 'Double', 'Float',
  'Boolean', 'Object', 'Arrays', 'Collections', 'Math', 'Optional',
  'List', 'Map', 'Set', 'HashMap', 'ArrayList', 'HashSet',
  'Exception', 'RuntimeException', 'Thread', 'Runnable',
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

function extractPythonCalleeInfo(callNode: AstNode): CalleeInfo | null {
  // Python call node: first child is the function expression
  const funcChild = callNode.children[0];
  if (!funcChild) return null;

  // Direct call: foo()
  if (funcChild.type === 'identifier') {
    if (PYTHON_SKIP_NAMES.has(funcChild.text)) return null;
    return {
      name: funcChild.text,
      callType: 'direct',
      isThisCall: false,
      objectName: null,
      isDynamic: false,
    };
  }

  // Method call: obj.method() or self.method()
  if (funcChild.type === 'attribute') {
    // attribute children: [object, '.', identifier]
    const objectChild = funcChild.children[0];
    const propChild = funcChild.children.find(
      (c) => c.type === 'identifier' && c !== objectChild,
    );
    if (!propChild) return null;

    const objectName = objectChild?.text ?? null;
    const isSelf = objectName === 'self' || objectName === 'cls';

    if (objectName && PYTHON_SKIP_NAMES.has(objectName)) return null;

    return {
      name: propChild.text,
      callType: 'method',
      isThisCall: isSelf,
      objectName,
      isDynamic: false,
    };
  }

  return null;
}

function extractJavaCalleeInfo(callNode: AstNode): CalleeInfo | null {
  if (callNode.type === 'method_invocation') {
    // method_invocation children patterns:
    // Simple: identifier argument_list → direct call
    // Method: object '.' identifier argument_list → method call

    const children = callNode.children.filter(
      (c) => c.type !== '.' && c.type !== 'argument_list',
    );

    if (children.length === 1 && children[0].type === 'identifier') {
      // Direct call: foo()
      if (JAVA_SKIP_NAMES.has(children[0].text)) return null;
      return {
        name: children[0].text,
        callType: 'direct',
        isThisCall: false,
        objectName: null,
        isDynamic: false,
      };
    }

    // Method call: obj.method() or this.method()
    const identifiers = callNode.children.filter((c) => c.type === 'identifier');
    const hasThis = callNode.children.some((c) => c.type === 'this');

    // The method name is the identifier immediately before argument_list
    const argListIdx = callNode.children.findIndex((c) => c.type === 'argument_list');
    let methodName: string | null = null;
    if (argListIdx > 0) {
      const prev = callNode.children[argListIdx - 1];
      if (prev.type === 'identifier') {
        methodName = prev.text;
      }
    }
    if (!methodName && identifiers.length > 0) {
      methodName = identifiers[identifiers.length - 1].text;
    }

    if (!methodName) return null;

    // Determine object name
    let objectName: string | null = null;
    if (hasThis) {
      objectName = 'this';
    } else if (identifiers.length > 1) {
      objectName = identifiers[0].text;
    } else {
      const firstChild = callNode.children[0];
      if (firstChild && firstChild.type !== 'identifier') {
        objectName = firstChild.text;
      }
    }

    if (objectName && JAVA_SKIP_NAMES.has(objectName)) return null;

    return {
      name: methodName,
      callType: 'method',
      isThisCall: hasThis,
      objectName,
      isDynamic: false,
    };
  }

  if (callNode.type === 'object_creation_expression') {
    // new Foo() → find type_identifier or identifier
    const typeIdent = callNode.children.find(
      (c) => c.type === 'type_identifier' || c.type === 'identifier',
    );
    if (!typeIdent) return null;
    if (JAVA_SKIP_NAMES.has(typeIdent.text)) return null;

    return {
      name: typeIdent.text,
      callType: 'new',
      isThisCall: false,
      objectName: null,
      isDynamic: false,
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
 * @param language          Source language (defaults to JS/TS behaviour)
 */
export function analyzeCallRelations(
  root: AstNode,
  fileId: string,
  localFunctions: ParsedFunction[],
  importedFunctions: Map<string, { fileId: string; functionName: string }>,
  language?: SupportedLanguage,
): CallRelation[] {
  const isTreeSitter =
    root.type === 'program' || root.type === 'source_file' || root.type === 'module';
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
    let calleeInfo: CalleeInfo | null = null;
    let isNewExpr = false;

    if (language === 'python') {
      // Python: 'call' for all function/method calls; no 'new' expression syntax
      if (node.type !== 'call') return;
      calleeInfo = extractPythonCalleeInfo(node);
    } else if (language === 'java') {
      // Java: 'method_invocation' for calls, 'object_creation_expression' for new
      if (node.type === 'method_invocation') {
        calleeInfo = extractJavaCalleeInfo(node);
      } else if (node.type === 'object_creation_expression') {
        isNewExpr = true;
        calleeInfo = extractJavaCalleeInfo(node);
      } else {
        return;
      }
    } else {
      // JS/TS: existing tree-sitter and TS Compiler API paths (unchanged)
      const isCallExpr = isTreeSitter
        ? node.type === 'call_expression'
        : node.type === 'CallExpression';
      isNewExpr = isTreeSitter
        ? node.type === 'new_expression'
        : node.type === 'NewExpression';

      if (!isCallExpr && !isNewExpr) return;

      calleeInfo = isTreeSitter
        ? extractTreeSitterCalleeInfo(node, isNewExpr)
        : extractTsCalleeInfo(node, isNewExpr);
    }

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
