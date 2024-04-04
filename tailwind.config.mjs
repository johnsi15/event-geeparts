import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans Variable', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        geeparts: {
          50: '#fefbe8',
          100: '#fff6c2',
          200: '#ffe989',
          300: '#ffcf2c',
          400: '#fdbe12',
          500: '#eca406',
          600: '#cc7d02',
          700: '#a35705',
          800: '#86450d',
          900: '#723811',
          950: '#431c05',
        },
      },
    },
  },
  plugins: [],
}
