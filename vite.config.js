import { defineConfig } from 'vitest/config'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), htmlTitlePlugin()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['functions/**/*.test.js', 'src/**/*.test.js'],
        },
      },
      {
        extends: true,
        test: {
          name: 'react',
          environment: 'jsdom',
          setupFiles: './src/test/setup.js',
          include: ['src/**/*.test.jsx'],
        },
      },
    ],
  },
})

function htmlTitlePlugin() {
  return {
    name: 'expertenstatus-html-title',
    transformIndexHtml(html) {
      const title = process.env.npm_lifecycle_event === 'build:admin'
        ? 'Expertenstatus Admin'
        : 'Expertenstatus'
      return html.replace(/<title>.*<\/title>/, `<title>${title}</title>`)
    },
  }
}
