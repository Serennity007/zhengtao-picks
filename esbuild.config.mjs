import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const banner = `/*
 * 正涛精选 (Zhengtao Picks) — Obsidian plugin
 * MIT License, Copyright (c) 2026 正涛 (Serennity007)
 */`;

const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'main.js',
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  external: ['obsidian', 'electron'],
  banner: { js: banner },
  logLevel: 'warning',
  sourcemap: false,
  minify: false,
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
