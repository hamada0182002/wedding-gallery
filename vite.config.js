import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base './' يجعل الموقع يعمل على GitHub Pages بأي اسم للمستودع
export default defineConfig({ plugins: [react()], base: './' });
