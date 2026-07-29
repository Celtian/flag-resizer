import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: 'esm',
  fixedExtension: false,
  hash: false,
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['c12', 'sharp', 'zod'],
});
