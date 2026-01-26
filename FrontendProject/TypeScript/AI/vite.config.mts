import {ConfigEnv, defineConfig, UserConfig} from 'vite';
import * as path from 'path';

export default defineConfig((env: ConfigEnv): UserConfig => {
  return {
    server: {
      port: 80,
    },
    preview: {
      allowedHosts: ['xiaofan.laogeworld.cn'],
    },
    root: './',
    base: '/',
    publicDir: './public',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@framework': path.resolve(__dirname, '../../../Framework/src'),
      }
    },
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: 'react',
    },
    optimizeDeps: {
      esbuildOptions: {
        jsx: 'automatic',
        jsxImportSource: 'react',
      },
    },
    build: {
      target: 'modules',
      assetsDir: 'assets',
      outDir: './dist',
      sourcemap: env.mode == 'development',
    },
  };
});
