import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: { bg: '#1A1D21', bg2: '#26343D', navy: '#0D1720', cyan: { DEFAULT: '#00E0E0', bright: '#00FFFF' }, muted: '#AEB8C0' },
    borderColor: { DEFAULT: 'rgba(255,255,255,0.10)' },
    fontFamily: { sans: ['Inter','Manrope','"Noto Sans Arabic"','system-ui','-apple-system','"Segoe UI"','Tahoma','sans-serif'] },
    maxWidth: { page: '76rem' },
  } },
} satisfies Config;
