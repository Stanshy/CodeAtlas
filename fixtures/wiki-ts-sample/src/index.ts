import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { authenticate } from './middleware/auth-guard';

export interface AppConfig {
  port: number;
  host: string;
  jwtSecret: string;
}

const DEFAULT_CONFIG: AppConfig = {
  port: 3000,
  host: '0.0.0.0',
  jwtSecret: 'change-me-in-production',
};

export function createApp(config: Partial<AppConfig> = {}) {
  const resolvedConfig: AppConfig = { ...DEFAULT_CONFIG, ...config };

  const publicRoutes = [...authRoutes];
  const protectedRoutes = userRoutes.map((r) => ({
    ...r,
    middlewares: [authenticate],
  }));

  const allRoutes = [...publicRoutes, ...protectedRoutes];

  return {
    config: resolvedConfig,
    routes: allRoutes,
    routeCount: allRoutes.length,
  };
}

export function start(config?: Partial<AppConfig>): void {
  const app = createApp(config);
  console.log(`CodeAtlas wiki-ts-sample listening on ${app.config.host}:${app.config.port}`);
  console.log(`Registered ${app.routeCount} routes`);
}

export { authRoutes, userRoutes };
