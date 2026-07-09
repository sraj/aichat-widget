/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--widget-primary-color)',
        background: 'var(--widget-background-color)',
        text: 'var(--widget-text-color)',
      },
      fontFamily: {
        sans: 'var(--widget-font-family)',
      },
      borderRadius: {
        widget: 'var(--widget-border-radius)',
      },
    },
  },
  plugins: [],
};
