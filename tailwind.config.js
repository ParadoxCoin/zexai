/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#7C3AED', // Violet 600
                    hover: '#6D28D9', // Violet 700
                },
                secondary: {
                    DEFAULT: '#10B981', // Emerald 500
                    hover: '#059669', // Emerald 600
                },
                dark: {
                    DEFAULT: '#0F172A', // Slate 900
                    lighter: '#1E293B', // Slate 800
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
