/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0f1e',
        card: '#111827',
        'card-hover': '#1f2937',
        border: '#1f2937',
        'border-subtle': '#374151',
        accent: {
          purple: '#8b5cf6',
          blue: '#3b82f6',
          'purple-dark': '#7c3aed',
          'blue-dark': '#2563eb',
        },
        text: {
          primary: '#f9fafb',
          secondary: '#9ca3af',
          muted: '#6b7280',
        },
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
        'gradient-accent-hover': 'linear-gradient(135deg, #7c3aed, #2563eb)',
        'gradient-card': 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(59,130,246,0.1))',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-border': 'pulseBorder 2s ease-in-out infinite',
        'typing-dot': 'typingDot 1.4s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseBorder: {
          '0%, 100%': { borderColor: 'rgba(139,92,246,0.4)' },
          '50%': { borderColor: 'rgba(139,92,246,0.9)' },
        },
        typingDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '30%': { transform: 'translateY(-6px)', opacity: '1' },
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-purple': '0 0 20px rgba(139,92,246,0.3)',
        'glow-blue': '0 0 20px rgba(59,130,246,0.3)',
        'card': '0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
};
