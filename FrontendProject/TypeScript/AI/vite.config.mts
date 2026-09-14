import {ConfigEnv, defineConfig, UserConfig} from 'vite';
import * as path from 'path';

export default defineConfig((env: ConfigEnv): UserConfig => {
  const isDesktopBuild = env.mode === 'desktop';
  return {
    server: {
      port: 8080,
    },
    preview: {
      allowedHosts: ['xiaofan.laogeworld.cn'],
    },
    root: './',
    // Electron 生产包通过 file:// 加载，必须使用相对资源路径。
    base: isDesktopBuild ? './' : '/',
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
