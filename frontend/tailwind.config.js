/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",   // Scan all files in the src directory
    "./public/**/*.html",           // Include HTML files in public
    "./pages/**/*.{js,ts,jsx,tsx}", // Next.js pages directory (optional if using app)
    "./components/**/*.{js,ts,jsx,tsx}", // Components directory
    "./app/**/*.{js,ts,jsx,tsx}"    // Next.js app directory
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
};
