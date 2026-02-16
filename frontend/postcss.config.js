export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    "postcss-rtlcss": { safeBothPrefix: true }, // Auto-generates [dir="rtl"] and [dir="ltr"] styles
  },
};
