/**
 * @codeatlas/core — Spring Boot adapter unit tests
 *
 * Test coverage:
 *   1. detect() returns null when no spring-boot in pom.xml
 *   2. detect() returns detection for pom.xml with spring-boot-starter-web
 *   3. detect() returns detection for build.gradle with spring-boot-starter-web
 *   4. extractEndpoints() finds @GetMapping/@PostMapping/@PutMapping/@DeleteMapping
 *   5. extractEndpoints() handles class-level @RequestMapping prefix composition
 *   6. extractEndpoints() handles @RequestMapping with method attribute
 *   7. extractEndpoints() handles @RequestMapping(value = "/path") syntax
 *   8. extractEndpoints() returns empty for non-Spring files
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the method-role-classifier to avoid AI dependency
vi.mock('../../src/ai/method-role-classifier.js', () => ({
  classifyMethodRole: () => ({ role: 'utility', confidence: 0.5 }),
}));

import { SpringBootAdapter } from '../../src/analyzers/adapters/spring-boot-adapter.js';
import type { AdapterContext } from '../../src/analyzers/adapters/types.js';
import type { AnalysisResult, GraphNode, GraphEdge } from '../../src/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFileNode(id: string, filePath: string, language = 'java'): GraphNode {
  return {
    id,
    type: 'file',
    label: filePath.split('/').pop() ?? filePath,
    filePath,
    metadata: { language },
  };
}

function makeAnalysis(
  nodes: GraphNode[],
  edges: GraphEdge[] = [],
  projectPath = '/project',
): AnalysisResult {
  return {
    projectPath,
    graph: { nodes, edges },
  } as unknown as AnalysisResult;
}

function makeContext(analysis: AnalysisResult): AdapterContext {
  const nodeMap = new Map<string, GraphNode>(
    analysis.graph.nodes.map((n) => [n.id, n]),
  );
  const callAdjacency = new Map<string, string[]>();
  for (const edge of analysis.graph.edges) {
    if (edge.type !== 'call') continue;
    const existing = callAdjacency.get(edge.source);
    if (existing) {
      existing.push(edge.target);
    } else {
      callAdjacency.set(edge.source, [edge.target]);
    }
  }
  return {
    analysis,
    nodeMap,
    callAdjacency,
    functionsByLabel: new Map(),
    functionNodes: [],
  };
}

// ---------------------------------------------------------------------------
// Source code fixtures
// ---------------------------------------------------------------------------

const POM_WITHOUT_SPRING = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <dependencies>
    <dependency>
      <groupId>com.google.guava</groupId>
      <artifactId>guava</artifactId>
    </dependency>
  </dependencies>
</project>`;

const POM_WITH_SPRING = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
  </dependencies>
</project>`;

const BUILD_GRADLE_WITH_SPRING = `plugins {
    id 'org.springframework.boot' version '3.2.0'
}
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
}`;

const CONTROLLER_WITH_MAPPINGS = `package com.example.demo;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.findById(id);
    }

    @PostMapping("")
    public User createUser(@RequestBody UserDto dto) {
        return userService.create(dto);
    }

    @PutMapping("/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody UserDto dto) {
        return userService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        userService.delete(id);
    }

    @PatchMapping("/{id}/status")
    public User patchStatus(@PathVariable Long id, @RequestBody StatusDto dto) {
        return userService.patchStatus(id, dto);
    }
}`;

const CONTROLLER_WITH_REQUEST_MAPPING_METHOD = `package com.example.demo;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/legacy")
public class LegacyController {

    @RequestMapping(value = "/items", method = RequestMethod.GET)
    public List<Item> listItems() {
        return itemService.findAll();
    }

    @RequestMapping(method = RequestMethod.POST, value = "/items")
    public Item createItem(@RequestBody ItemDto dto) {
        return itemService.create(dto);
    }
}`;

const CONTROLLER_NO_CLASS_PREFIX = `package com.example.demo;

import org.springframework.web.bind.annotation.*;

@RestController
public class HealthController {

    @GetMapping("/health")
    public String health() {
        return "OK";
    }

    @GetMapping("/ready")
    public String ready() {
        return "READY";
    }
}`;

const NON_SPRING_JAVA = `package com.example.demo;

public class Utils {
    public static String formatName(String first, String last) {
        return first + " " + last;
    }
}`;

const CONTROLLER_VALUE_SYNTAX = `package com.example.demo;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v2")
public class ItemController {

    @GetMapping(value = "/items")
    public List<Item> listItems() {
        return itemService.findAll();
    }

    @PostMapping(value = "/items")
    public Item createItem(@RequestBody ItemDto dto) {
        return itemService.create(dto);
    }
}`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SpringBootAdapter', () => {
  let adapter: SpringBootAdapter;

  beforeEach(() => {
    adapter = new SpringBootAdapter();
  });

  // -----------------------------------------------------------------------
  // detect() — takes AnalysisResult, not AdapterContext
  // -----------------------------------------------------------------------

  describe('detect()', () => {
    it('returns null when pom.xml has no spring-boot-starter-web', () => {
      const pomNode = makeFileNode('pom', 'pom.xml', 'xml');
      const analysis = makeAnalysis([pomNode]);

      // Mock readSourceCode on the adapter instance
      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath === 'pom.xml') return POM_WITHOUT_SPRING;
        return '';
      };

      const result = adapter.detect(analysis);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(result).toBeNull();
    });

    it('returns detection for pom.xml with spring-boot-starter-web', () => {
      const pomNode = makeFileNode('pom', 'pom.xml', 'xml');
      const analysis = makeAnalysis([pomNode]);

      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath === 'pom.xml') return POM_WITH_SPRING;
        return '';
      };

      const result = adapter.detect(analysis);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(result).not.toBeNull();
      expect(result!.adapterName).toBe('spring-boot');
      expect(result!.confidence).toBe(1.0);
    });

    it('returns detection for build.gradle with spring-boot-starter-web', () => {
      const gradleNode = makeFileNode('gradle', 'build.gradle', 'groovy');
      const analysis = makeAnalysis([gradleNode]);

      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath === 'build.gradle') return BUILD_GRADLE_WITH_SPRING;
        return '';
      };

      const result = adapter.detect(analysis);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(result).not.toBeNull();
      expect(result!.adapterName).toBe('spring-boot');
      expect(result!.confidence).toBe(1.0);
    });
  });

  // -----------------------------------------------------------------------
  // extractEndpoints() — takes AdapterContext
  // -----------------------------------------------------------------------

  describe('extractEndpoints()', () => {
    it('finds @GetMapping/@PostMapping/@PutMapping/@DeleteMapping/@PatchMapping', () => {
      const controllerNode = makeFileNode(
        'UserController',
        'src/main/java/com/example/demo/UserController.java',
      );
      const analysis = makeAnalysis([controllerNode]);
      const ctx = makeContext(analysis);

      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath.endsWith('.java')) return CONTROLLER_WITH_MAPPINGS;
        return '';
      };

      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(5);

      const methods = endpoints.map((e) => e.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('PUT');
      expect(methods).toContain('DELETE');
      expect(methods).toContain('PATCH');

      // Verify path composition
      const getEndpoint = endpoints.find((e) => e.method === 'GET');
      expect(getEndpoint!.path).toBe('/api/users/{id}');
      expect(getEndpoint!.handler).toBe('getUser');

      const postEndpoint = endpoints.find((e) => e.method === 'POST');
      expect(postEndpoint!.path).toBe('/api/users');

      const patchEndpoint = endpoints.find((e) => e.method === 'PATCH');
      expect(patchEndpoint!.path).toBe('/api/users/{id}/status');
    });

    it('handles class-level @RequestMapping prefix composition', () => {
      const controllerNode = makeFileNode(
        'UserController',
        'src/main/java/com/example/demo/UserController.java',
      );
      const analysis = makeAnalysis([controllerNode]);
      const ctx = makeContext(analysis);

      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath.endsWith('.java')) return CONTROLLER_WITH_MAPPINGS;
        return '';
      };

      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      // All paths should start with /api/users
      for (const ep of endpoints) {
        expect(ep.path).toMatch(/^\/api\/users/);
      }
    });

    it('handles controller without class-level prefix', () => {
      const controllerNode = makeFileNode(
        'HealthController',
        'src/main/java/com/example/demo/HealthController.java',
      );
      const analysis = makeAnalysis([controllerNode]);
      const ctx = makeContext(analysis);

      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath.endsWith('.java')) return CONTROLLER_NO_CLASS_PREFIX;
        return '';
      };

      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(2);
      expect(endpoints.map((e) => e.path).sort()).toEqual(['/health', '/ready']);
    });

    it('handles @RequestMapping with method attribute', () => {
      const controllerNode = makeFileNode(
        'LegacyController',
        'src/main/java/com/example/demo/LegacyController.java',
      );
      const analysis = makeAnalysis([controllerNode]);
      const ctx = makeContext(analysis);

      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath.endsWith('.java')) return CONTROLLER_WITH_REQUEST_MAPPING_METHOD;
        return '';
      };

      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(2);

      const getEndpoint = endpoints.find((e) => e.method === 'GET');
      expect(getEndpoint).toBeDefined();
      expect(getEndpoint!.path).toBe('/api/legacy/items');
      expect(getEndpoint!.handler).toBe('listItems');

      const postEndpoint = endpoints.find((e) => e.method === 'POST');
      expect(postEndpoint).toBeDefined();
      expect(postEndpoint!.path).toBe('/api/legacy/items');
      expect(postEndpoint!.handler).toBe('createItem');
    });

    it('handles @RequestMapping(value = "/path") syntax', () => {
      const controllerNode = makeFileNode(
        'ItemController',
        'src/main/java/com/example/demo/ItemController.java',
      );
      const analysis = makeAnalysis([controllerNode]);
      const ctx = makeContext(analysis);

      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath.endsWith('.java')) return CONTROLLER_VALUE_SYNTAX;
        return '';
      };

      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(2);

      const getEndpoint = endpoints.find((e) => e.method === 'GET');
      expect(getEndpoint!.path).toBe('/api/v2/items');

      const postEndpoint = endpoints.find((e) => e.method === 'POST');
      expect(postEndpoint!.path).toBe('/api/v2/items');
    });

    it('returns empty for non-Spring files', () => {
      const utilNode = makeFileNode(
        'Utils',
        'src/main/java/com/example/demo/Utils.java',
      );
      const analysis = makeAnalysis([utilNode]);
      const ctx = makeContext(analysis);

      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath.endsWith('.java')) return NON_SPRING_JAVA;
        return '';
      };

      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      expect(endpoints).toHaveLength(0);
    });

    it('generates correct endpoint IDs', () => {
      const controllerNode = makeFileNode(
        'UserController',
        'src/main/java/com/example/demo/UserController.java',
      );
      const analysis = makeAnalysis([controllerNode]);
      const ctx = makeContext(analysis);

      const originalReadSourceCode = (adapter as any).readSourceCode;
      (adapter as any).readSourceCode = (_a: any, node: GraphNode) => {
        if (node.filePath.endsWith('.java')) return CONTROLLER_WITH_MAPPINGS;
        return '';
      };

      const endpoints = adapter.extractEndpoints(ctx);

      (adapter as any).readSourceCode = originalReadSourceCode;

      const ids = endpoints.map((e) => e.id);
      expect(ids).toContain('GET /api/users/{id}');
      expect(ids).toContain('POST /api/users');
      expect(ids).toContain('PUT /api/users/{id}');
      expect(ids).toContain('DELETE /api/users/{id}');
      expect(ids).toContain('PATCH /api/users/{id}/status');
    });
  });

  // -----------------------------------------------------------------------
  // Adapter identity
  // -----------------------------------------------------------------------

  describe('adapter identity', () => {
    it('has correct name, displayName, and language', () => {
      expect(adapter.name).toBe('spring-boot');
      expect(adapter.displayName).toBe('Spring Boot');
      expect(adapter.language).toBe('java');
    });
  });
});
