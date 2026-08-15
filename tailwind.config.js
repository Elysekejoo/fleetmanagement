/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:   { DEFAULT: '#0B1628', 2: '#101C31', 3: '#22304A' },
        blue:   { DEFAULT: '#155EEF', md: '#2563EB', lt: '#EFF6FF' },
        gold:   { DEFAULT: '#F5B400', light: '#F7C948' },
        bg:     { DEFAULT: '#F6F8FB', 2: '#EEF2F6' },
        line:   { DEFAULT: '#E4E7EC', dark: '#D0D5DD' },
        ink:    { DEFAULT: '#101828', 2: '#475467', 3: '#667085' },
        ok:     { DEFAULT: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
        danger: { DEFAULT: '#C62828', bg: '#FEF2F2', border: '#FECACA' },
        warn:   { DEFAULT: '#B7791F', bg: '#FFFBEB', border: '#FDE68A' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(16, 24, 40, 0.04)',
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 2px 8px rgba(16, 24, 40, 0.06)',
      },
    },
  },
  plugins: [],
};