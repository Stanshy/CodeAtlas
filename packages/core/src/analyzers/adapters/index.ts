/**
 * @file Barrel export for FrameworkAdapter plugin system
 * @description Sprint 24 T19 — exports all adapter types, classes, and registry
 */

// Types
export type {
  FrameworkAdapter,
  AdapterContext,
  FrameworkDetection,
  MiddlewareScope,
  MiddlewareDescriptor,
  AdapterRegistryEntry,
} from './types.js';

// Registry
export { AdapterRegistry, createDefaultRegistry } from './registry.js';

// Base classes
export { BaseAdapter } from './base-adapter.js';
export { PythonBaseAdapter } from './python-base-adapter.js';

// JS/TS Framework Adapters
export { ExpressAdapter } from './express-adapter.js';
export { FastifyAdapter } from './fastify-adapter.js';
export { NestJSAdapter } from './nestjs-adapter.js';
export { KoaAdapter } from './koa-adapter.js';
export { HonoAdapter } from './hono-adapter.js';

// Python Framework Adapters
export { DjangoAdapter } from './django-adapter.js';
export { FlaskAdapter } from './flask-adapter.js';
export { FastAPIAdapter } from './fastapi-adapter.js';

// Java Framework Adapters
export { SpringBootAdapter } from './spring-boot-adapter.js';

// AI Fallback
export { AIFallbackAdapter } from './ai-fallback-adapter.js';
