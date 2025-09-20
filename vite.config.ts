import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Environment variables are now handled by Vite's built-in env support
    return {
      plugins: [react()],
      esbuild: {
        target: 'es2020'
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        port: 5173,
        host: true
      },
      build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
          onwarn: () => {}, // Suppress all warnings
          output: {
            manualChunks: {
              // Vendor chunks
              'react-vendor': ['react', 'react-dom'],
              
              // Service chunks
              'api-services': [
                './services/footballApiService.ts',
                './services/geminiService.ts',
                './services/newsService.ts'
              ],
              
              // Component chunks
              'dashboard-components': [
                './components/Dashboard.tsx',
                './components/MatchCard.tsx',
                './components/TeamInfo.tsx'
              ],
              
              'fixtures-components': [
                './components/Fixtures.tsx',
                './components/CleanFixturesList.tsx'
              ],
              
              
              // Utility chunks
              'analytics-monitoring': [
                './services/coreWebVitalsService.ts',
                './services/performanceService.ts',
                './services/performanceMonitor.ts'
              ]
            },
            chunkFileNames: (chunkInfo) => {
              const facadeModuleId = chunkInfo.facadeModuleId
              if (facadeModuleId) {
                return `js/[name]-[hash].js`
              }
              return `js/[name]-[hash].js`
            }
          }
        },
        chunkSizeWarningLimit: 1000
      },
      define: {
        'process.env': {}
      }
    };
});
