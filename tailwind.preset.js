/**
 * Shared Tailwind preset for Cimaise.
 *
 * Holds the theme, plugins and safelist that are common to every Tailwind
 * build (frontend, admin, legacy default). The per-target configs
 * (tailwind.frontend.config.js / tailwind.admin.config.js) only differ in
 * their `content` globs so each bundle is purged against the templates that
 * actually load it.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: 'class',
  // Safelist essential responsive utilities that must always be included
  safelist: [
    'hidden',
    'block',
    'flex',
    'inline-flex',
    'sm:hidden',
    'sm:block',
    'sm:flex',
    'sm:inline-flex',
    'md:hidden',
    'md:block',
    'md:flex',
    'md:inline-flex',
    'lg:hidden',
    'lg:block',
    'lg:flex',
    'lg:inline-flex',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Editorial display face (self-hosted) for the wordmark, page titles
        // and feature numbers. Never used for labels/data.
        serif: ['Playfair Display', 'Georgia', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        black: '#2b3a39',
        white: '#ffedb7',
        // Warm neutral ramp organized around the user's cream and taupe swatches.
        primary: {
          50: '#fff8df',
          100: '#ffedb7',
          200: '#eadca9',
          300: '#c5b99a',
          400: '#97877b',
          500: '#685b53',
          600: '#574a43',
          700: '#443e39',
          800: '#2b3a39',
          900: '#1e2a29',
        },
        // Mint is the primary interactive color; teal provides its readable ink.
        accent: {
          50: '#eaf8f2',
          100: '#cff0e2',
          200: '#9de0c5',
          300: '#6bcfa8',
          400: '#59c39e',
          500: '#4aba94',
          600: '#3d9877',
          700: '#327960',
          800: '#285f4d',
          900: '#20483c',
        },
        // Mint support shades and burnt-orange highlight shades.
        sage: {
          50: '#eaf8f2',
          100: '#cff0e2',
          200: '#9de0c5',
          300: '#6bcfa8',
          400: '#59c39e',
          500: '#4aba94',
          600: '#3d9877',
          700: '#327960',
        },
        // Orange remains for secondary emphasis and highlight marks.
        amber: {
          50: '#fff0e8',
          100: '#fbd4c4',
          200: '#f2b49b',
          300: '#e9926f',
          400: '#df714d',
          500: '#d0542d',
          600: '#ae4527',
          700: '#87381f',
        },
        gray: {
          50: '#fff8df',
          100: '#ffedb7',
          200: '#eadca9',
          300: '#c5b99a',
          400: '#97877b',
          500: '#685b53',
          600: '#574a43',
          700: '#443e39',
          800: '#2b3a39',
          900: '#1e2a29',
        },
        neutral: {
          50: '#fff8df',
          100: '#ffedb7',
          200: '#eadca9',
          300: '#c5b99a',
          400: '#97877b',
          500: '#685b53',
          600: '#574a43',
          700: '#443e39',
          800: '#2b3a39',
          900: '#1e2a29',
        },
        cream: '#ffedb7',
        blush: '#d0542d',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
