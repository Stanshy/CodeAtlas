/**
 * @codeatlas/core — Function Extractor
 *
 * Sprint 7 / T3
 *
 * Walks an AstNode tree produced by any AstProvider and extracts function
 * and class definitions into normalized ParsedFunction and ParsedClass records.
 *
 * Two AST dialects are supported transparently (same as import-extractor):
 *   - tree-sitter (native / WASM): snake_case node types
 *   - TypeScript Compiler API (fallback): PascalCase SyntaxKind names
 */

import type { AstNode } from './ast-provider.js';
import type { FunctionParam } from '../types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParsedFunction {
  name: string;
  kind: 'function' | 'method' | 'getter' | 'setter' | 'constructor';
  parameters: FunctionParam[];
  returnType: string | undefined;
  startLine: number;
  endLine: number;
  isExported: boolean;
  isAsync: boolean;
  isGenerator: boolean;
  className?: string;
}

export interface ParsedClass {
  name: string;
  startLine: number;
  endLine: number;
  isExported: boolean;
  methods: ParsedFunction[];
}

export interface FunctionExtractionResult {
  functions: ParsedFunction[];
  classes: ParsedClass[];
}

// ---------------------------------------------------------------------------
// AST dialect detection
// ---------------------------------------------------------------------------

/** Returns true when the tree looks like it came from tree-sitter (snake_case). */
function isTreeSitterAst(root: AstNode): boolean {
  return root.type === 'program' || root.type === 'source_file';
}

// ---------------------------------------------------------------------------
// Shared helpers — same pattern as import-extractor
// ---------------------------------------------------------------------------

/** Find the first direct child node whose type is one of the given values. */
function findChild(node: AstNode, ...types: string[]): AstNode | undefined {
  for (const child of node.children) {
    if (types.includes(child.type)) return child;
  }
  return undefined;
}


// ---------------------------------------------------------------------------
// Parameter extraction
// ---------------------------------------------------------------------------

/**
 * Extract FunctionParam list from a formal_parameters (tree-sitter) or
 * Parameters (TS Compiler) node.
 */
function extractParameters(paramsNode: AstNode): FunctionParam[] {
  const params: FunctionParam[] = [];

  for (const child of paramsNode.children) {
    // --- tree-sitter dialect ---
    if (
      child.type === 'required_parameter' ||
      child.type === 'optional_parameter' ||
      child.type === 'rest_pattern' ||
      child.type === 'rest_parameter'
    ) {
      const ident = findChild(child, 'identifier');
      if (!ident) continue;

      const typeAnnotation = findChild(child, 'type_annotation');
      let typeStr: string | undefined;
      if (typeAnnotation) {
        // type_annotation text is ": TypeName" — strip leading ": "
        typeStr = typeAnnotation.text.replace(/^\s*:\s*/, '').trim();
      }

      const param: FunctionParam = { name: ident.text };
      if (typeStr !== undefined) param.type = typeStr;
      if (child.type === 'optional_parameter') param.isOptional = true;
      if (child.type === 'rest_pattern' || child.type === 'rest_parameter') param.isRest = true;
      params.push(param);
      continue;
    }

    // --- tree-sitter: plain identifier parameter (JS, no type annotation) ---
    if (child.type === 'identifier') {
      params.push({ name: child.text });
      continue;
    }

    // --- tree-sitter: assignment_pattern (default value param) ---
    if (child.type === 'assignment_pattern') {
      const ident = findChild(child, 'identifier');
      if (ident) {
        params.push({ name: ident.text, isOptional: true });
      }
      continue;
    }

    // --- TS Compiler dialect ---
    if (child.type === 'Parameter') {
      const ident = child.children.find(
        (c) => c.type === 'Identifier' || c.type === 'BindingElement',
      );
      if (!ident) continue;

      const name =
        ident.type === 'Identifier' ? ident.text : (findChild(ident, 'Identifier')?.text ?? ident.text);

      const hasOptional = child.children.some((c) => c.text === '?');
      const hasRest = child.children.some((c) => c.type === 'DotDotDotToken' || c.text === '...');

      const typeRef = child.children.find(
        (c) =>
          c.type === 'TypeReference' ||
          c.type === 'StringKeyword' ||
          c.type === 'NumberKeyword' ||
          c.type === 'BooleanKeyword' ||
          c.type === 'AnyKeyword' ||
          c.type === 'UnionType' ||
          c.type === 'ArrayType' ||
          c.type === 'TypeAnnotation',
      );
      const typeStr = typeRef ? typeRef.text.replace(/^\s*:\s*/, '').trim() : undefined;

      const tsParam: FunctionParam = { name };
      if (typeStr) tsParam.type = typeStr;
      if (hasOptional) tsParam.isOptional = true;
      if (hasRest) tsParam.isRest = true;
      params.push(tsParam);
      continue;
    }
  }

  return params;
}

// ---------------------------------------------------------------------------
// Return type extraction
// ---------------------------------------------------------------------------

/**
 * Extract the return type annotation text from a function/method node.
 * Handles both tree-sitter (type_annotation after formal_parameters) and
 * TS Compiler API (TypeReference / etc. after Parameters).
 */
function extractReturnType(funcNode: AstNode): string | undefined {
  // tree-sitter: find type_annotation that is NOT inside formal_parameters
  // Strategy: walk direct children, skip formal_parameters, find type_annotation
  let seenParams = false;
  for (const child of funcNode.children) {
    if (
      child.type === 'formal_parameters' ||
      child.type === 'Parameters' ||
      child.type === 'parameters'
    ) {
      seenParams = true;
      continue;
    }
    if (seenParams && (child.type === 'type_annotation' || child.type === 'TypeAnnotation')) {
      return child.text.replace(/^\s*:\s*/, '').trim();
    }
    // TS Compiler: return_type or TypeReference at top level of method
    if (child.type === 'return_type') {
      return child.text.replace(/^\s*:\s*/, '').trim();
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// tree-sitter dialect extraction
// ---------------------------------------------------------------------------

/** Extract a ParsedFunction from a function_declaration or generator_function_declaration node. */
function extractTreeSitterFunction(
  node: AstNode,
  isExported: boolean,
  isGenerator: boolean,
): ParsedFunction | null {
  const nameNode = findChild(node, 'identifier');
  if (!nameNode) return null;

  const isAsync = node.children.some((c) => c.type === 'async' || c.text === 'async');

  const paramsNode = findChild(node, 'formal_parameters');
  const parameters = paramsNode ? extractParameters(paramsNode) : [];

  const returnType = extractReturnType(node);

  return {
    name: nameNode.text,
    kind: 'function',
    parameters,
    returnType,
    startLine: node.startLine,
    endLine: node.endLine,
    isExported,
    isAsync,
    isGenerator,
  };
}

/** Extract a ParsedFunction from a tree-sitter method_definition node. */
function extractTreeSitterMethod(
  node: AstNode,
  className: string,
): ParsedFunction | null {
  const nameNode = findChild(node, 'property_identifier', 'identifier', 'private_property_identifier');
  if (!nameNode) return null;

  const name = nameNode.text;
  const isAsync = node.children.some((c) => c.text === 'async');
  const hasGet = node.children.some((c) => c.text === 'get');
  const hasSet = node.children.some((c) => c.text === 'set');

  let kind: ParsedFunction['kind'] = 'method';
  if (name === 'constructor') kind = 'constructor';
  else if (hasGet) kind = 'getter';
  else if (hasSet) kind = 'setter';

  const paramsNode = findChild(node, 'formal_parameters');
  const parameters = paramsNode ? extractParameters(paramsNode) : [];

  const returnType = extractReturnType(node);

  return {
    name,
    kind,
    parameters,
    returnType,
    startLine: node.startLine,
    endLine: node.endLine,
    isExported: false, // class methods inherit export from class
    isAsync,
    isGenerator: false,
    className,
  };
}

/** Extract a ParsedClass from a tree-sitter class_declaration node. */
function extractTreeSitterClass(
  node: AstNode,
  isExported: boolean,
): ParsedClass | null {
  const nameNode = findChild(node, 'type_identifier', 'identifier');
  if (!nameNode) return null;

  const className = nameNode.text;
  const methods: ParsedFunction[] = [];

  const classBody = findChild(node, 'class_body');
  if (classBody) {
    for (const child of classBody.children) {
      if (child.type === 'method_definition') {
        const method = extractTreeSitterMethod(child, className);
        if (method) methods.push(method);
      }
    }
  }

  return {
    name: className,
    startLine: node.startLine,
    endLine: node.endLine,
    isExported,
    methods,
  };
}

/**
 * Check whether a lexical_declaration (const/let/var) contains an arrow function
 * or function expression, and extract it as a ParsedFunction.
 */
function extractTreeSitterLexicalDeclaration(
  node: AstNode,
  isExported: boolean,
): ParsedFunction | null {
  for (const child of node.children) {
    if (child.type !== 'variable_declarator') continue;

    // name is identifier on left side of declarator
    const nameNode = findChild(child, 'identifier');
    if (!nameNode) continue;

    // right side: arrow_function or function_expression
    const rhs = findChild(child, 'arrow_function', 'function_expression', 'generator_function_expression');
    if (!rhs) continue;

    const isAsync = rhs.children.some((c) => c.text === 'async') ||
      node.children.some((c) => c.text === 'async');
    const isGenerator = rhs.type === 'generator_function_expression';

    const paramsNode = findChild(rhs, 'formal_parameters');
    const parameters = paramsNode ? extractParameters(paramsNode) : [];
    const returnType = extractReturnType(rhs);

    return {
      name: nameNode.text,
      kind: 'function',
      parameters,
      returnType,
      startLine: node.startLine,
      endLine: node.endLine,
      isExported,
      isAsync,
      isGenerator,
    };
  }

  return null;
}

/** Walk top-level children using tree-sitter dialect. */
function walkTreeSitterTopLevel(
  children: AstNode[],
  functions: ParsedFunction[],
  classes: ParsedClass[],
  isExported = false,
): void {
  for (const node of children) {
    if (
      node.type === 'function_declaration'
    ) {
      const fn = extractTreeSitterFunction(node, isExported, false);
      if (fn) functions.push(fn);
      continue;
    }

    if (node.type === 'generator_function_declaration') {
      const fn = extractTreeSitterFunction(node, isExported, true);
      if (fn) functions.push(fn);
      continue;
    }

    if (
      node.type === 'lexical_declaration' ||
      node.type === 'variable_declaration'
    ) {
      const fn = extractTreeSitterLexicalDeclaration(node, isExported);
      if (fn) functions.push(fn);
      continue;
    }

    if (node.type === 'class_declaration') {
      const cls = extractTreeSitterClass(node, isExported);
      if (cls) classes.push(cls);
      continue;
    }

    if (node.type === 'export_statement') {
      // Recurse into exported declaration
      walkTreeSitterTopLevel(node.children, functions, classes, true);
      continue;
    }
  }
}

// ---------------------------------------------------------------------------
// TypeScript Compiler API dialect extraction
// ---------------------------------------------------------------------------

/** Extract ParsedFunction from a TS Compiler FunctionDeclaration node. */
function extractTsFunctionDeclaration(
  node: AstNode,
  isExported: boolean,
): ParsedFunction | null {
  const nameNode = node.children.find((c) => c.type === 'Identifier');
  if (!nameNode) return null;

  const isAsync = node.children.some(
    (c) => c.type === 'AsyncKeyword' || c.text === 'async',
  );
  const isGenerator = node.children.some(
    (c) => c.type === 'AsteriskToken' || c.text === '*',
  );

  const paramsNode = node.children.find((c) => c.type === 'Parameters' || c.type === 'Parameter');
  // If it's a single Parameter, wrap concept; if Parameters, use directly
  const parameters = paramsNode
    ? paramsNode.type === 'Parameters'
      ? extractParameters(paramsNode)
      : []
    : [];

  // If we found Parameters node directly
  const paramsNodeDirect = node.children.find((c) => c.type === 'Parameters');
  const finalParams = paramsNodeDirect ? extractParameters(paramsNodeDirect) : parameters;

  const returnType = extractReturnType(node);

  return {
    name: nameNode.text,
    kind: 'function',
    parameters: finalParams,
    returnType,
    startLine: node.startLine,
    endLine: node.endLine,
    isExported,
    isAsync,
    isGenerator,
  };
}

/** Extract ParsedFunction from TS Compiler VariableStatement containing ArrowFunction/FunctionExpression. */
function extractTsVariableStatement(
  node: AstNode,
  isExported: boolean,
): ParsedFunction | null {
  // Walk into VariableDeclarationList → VariableDeclaration
  for (const child of node.children) {
    const listNode =
      child.type === 'VariableDeclarationList' ? child : null;
    if (!listNode) continue;

    for (const decl of listNode.children) {
      if (decl.type !== 'VariableDeclaration') continue;

      const nameNode = decl.children.find((c) => c.type === 'Identifier');
      if (!nameNode) continue;

      const rhs = decl.children.find(
        (c) =>
          c.type === 'ArrowFunction' ||
          c.type === 'FunctionExpression',
      );
      if (!rhs) continue;

      const isAsync = rhs.children.some(
        (c) => c.type === 'AsyncKeyword' || c.text === 'async',
      );

      const paramsNode = rhs.children.find((c) => c.type === 'Parameters');
      const parameters = paramsNode ? extractParameters(paramsNode) : [];
      const returnType = extractReturnType(rhs);

      return {
        name: nameNode.text,
        kind: 'function',
        parameters,
        returnType,
        startLine: node.startLine,
        endLine: node.endLine,
        isExported,
        isAsync,
        isGenerator: false,
      };
    }
  }
  return null;
}

/** Extract a ParsedFunction from a TS Compiler MethodDeclaration/Constructor/GetAccessor/SetAccessor. */
function extractTsMethod(
  node: AstNode,
  className: string,
): ParsedFunction | null {
  let kind: ParsedFunction['kind'] = 'method';
  if (node.type === 'Constructor') kind = 'constructor';
  else if (node.type === 'GetAccessor') kind = 'getter';
  else if (node.type === 'SetAccessor') kind = 'setter';

  const nameNode = node.children.find(
    (c) =>
      c.type === 'Identifier' ||
      c.type === 'StringLiteral' ||
      c.type === 'ComputedPropertyName',
  );

  let name: string;
  if (kind === 'constructor') {
    name = 'constructor';
  } else if (!nameNode) {
    return null;
  } else {
    name = nameNode.text;
  }

  const isAsync = node.children.some(
    (c) => c.type === 'AsyncKeyword' || c.text === 'async',
  );

  const paramsNode = node.children.find((c) => c.type === 'Parameters');
  const parameters = paramsNode ? extractParameters(paramsNode) : [];
  const returnType = extractReturnType(node);

  return {
    name,
    kind,
    parameters,
    returnType,
    startLine: node.startLine,
    endLine: node.endLine,
    isExported: false,
    isAsync,
    isGenerator: false,
    className,
  };
}

/** Extract ParsedClass from a TS Compiler ClassDeclaration node. */
function extractTsClassDeclaration(
  node: AstNode,
  isExported: boolean,
): ParsedClass | null {
  const nameNode = node.children.find((c) => c.type === 'Identifier');
  if (!nameNode) return null;

  const className = nameNode.text;
  const methods: ParsedFunction[] = [];

  // Walk class members
  for (const child of node.children) {
    if (
      child.type === 'MethodDeclaration' ||
      child.type === 'Constructor' ||
      child.type === 'GetAccessor' ||
      child.type === 'SetAccessor'
    ) {
      const method = extractTsMethod(child, className);
      if (method) methods.push(method);
    }
    // Also walk SyntaxList which may contain class members
    if (child.type === 'SyntaxList') {
      for (const member of child.children) {
        if (
          member.type === 'MethodDeclaration' ||
          member.type === 'Constructor' ||
          member.type === 'GetAccessor' ||
          member.type === 'SetAccessor'
        ) {
          const method = extractTsMethod(member, className);
          if (method) methods.push(method);
        }
      }
    }
  }

  return {
    name: className,
    startLine: node.startLine,
    endLine: node.endLine,
    isExported,
    methods,
  };
}

/** Walk top-level children using TS Compiler API dialect. */
function walkTsCompilerTopLevel(
  children: AstNode[],
  functions: ParsedFunction[],
  classes: ParsedClass[],
  isExported = false,
): void {
  for (const node of children) {
    if (node.type === 'FunctionDeclaration') {
      const fn = extractTsFunctionDeclaration(node, isExported);
      if (fn) functions.push(fn);
      continue;
    }

    if (node.type === 'VariableStatement') {
      const fn = extractTsVariableStatement(node, isExported);
      if (fn) functions.push(fn);
      continue;
    }

    if (node.type === 'ClassDeclaration') {
      const cls = extractTsClassDeclaration(node, isExported);
      if (cls) classes.push(cls);
      continue;
    }

    // ExportDeclaration wrapping function/class
    if (node.type === 'ExportDeclaration' || node.type === 'ExportAssignment') {
      walkTsCompilerTopLevel(node.children, functions, classes, true);
      continue;
    }

    // FirstStatement / SyntaxList that may contain top-level declarations
    if (node.type === 'SyntaxList') {
      walkTsCompilerTopLevel(node.children, functions, classes, isExported);
      continue;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract all top-level functions and classes from an AstNode tree.
 *
 * @param root  Root AstNode from any AstProvider (tree-sitter or TS Compiler)
 */
export function extractFunctions(root: AstNode): FunctionExtractionResult {
  const functions: ParsedFunction[] = [];
  const classes: ParsedClass[] = [];

  if (isTreeSitterAst(root)) {
    walkTreeSitterTopLevel(root.children, functions, classes);
  } else {
    // TS Compiler API root type is "SourceFile"
    walkTsCompilerTopLevel(root.children, functions, classes);
  }

  return { functions, classes };
}
