import esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

esbuild.build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  tsconfig: './tsconfig.json',
  resolveExtensions: ['.ts', '.js', '.json'],
  loader: { '.ts': 'ts' },
  logLevel: 'info',
  // Exclude vite-related files from bundling (development only)
  external: ['./vite', './vite.js', '../vite.config', '../vite.config.js'],
}).catch(() => process.exit(1));
