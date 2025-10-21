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
}).catch(() => process.exit(1));
