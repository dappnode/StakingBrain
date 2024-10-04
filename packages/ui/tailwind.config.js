module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "text-purple": "#9333ea",
        "interface-000": "#fcfcfc",
        "interface-100": "#f0f0ef",
        "interface-200":"#e7e7e4",
        "interface-300": "#d3d3cf",
        "light-bg": "#f7f7f7",
        "dark-bg": "#1e1e1e",
        "dark-interface-000": "#121212",
        "dark-interface-100": "#3f3f3f",
        "dark-interface-200": "#575757",
        "dark-interface-300": "#282828",

      },
      fontFamily: {
        modeG: ["Mode G", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
    },
  },
  plugins: []
};
