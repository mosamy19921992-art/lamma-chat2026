import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const appBuildId =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    String(Date.now());

  return {
    define: {
      __APP_BUILD_ID__: JSON.stringify(appBuildId),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // Split vendor libraries into their own chunks so the initial
      // payload stays small and the browser can cache them independently.
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('motion') || id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              return 'vendor';
            }
            
            // Design modules chunk
            if (id.includes('/services/design/')) {
              return 'design-modules';
            }
            
            // Chat screen split
            if (id.includes('/components/ChatScreen.tsx')) {
              return 'chat-screen';
            }
            
            // Large modals split
            if (id.includes('/components/modals/DesignCenterModal.tsx')) {
              return 'design-center-modal';
            }
            if (id.includes('/components/modals/UserProfileModal.tsx')) {
              return 'user-profile-modal';
            }
            if (id.includes('/components/modals/OwnerPanelModal.tsx')) {
              return 'owner-panel-modal';
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
  };
});
