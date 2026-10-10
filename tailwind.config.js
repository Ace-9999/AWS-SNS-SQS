/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aws: {
          squid: '#232F3E',
          smile: '#FF9900',
          orange: '#EC7211',
          anchor: '#0073BB',
          dark: '#0F172A',
          card: '#161F30',
          border: '#2A364F',
          eventbridge: '#C925D1',
          sns: '#E7157B',
          sqs: '#A855F7',
          consumer: '#F97316',
          cloudwatch: '#00A4A6',
          success: '#10B981',
          error: '#EF4444',
          warning: '#F59E0B'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

