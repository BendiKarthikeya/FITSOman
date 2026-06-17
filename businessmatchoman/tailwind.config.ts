import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  // Enable RTL support
  corePlugins: {
    // Enable dir utilities
  },
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'Noto Kufi Arabic',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        heading: [
          'Poppins',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif'
        ],
        brand: [
          'Playfair Display',
          'Georgia',
          'serif'
        ],
        arabic: ['Noto Kufi Arabic', 'Cairo', 'Amiri', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Professional Business Color Palette
        "primary-blue": "#1A3B5B",
        "accent-gold": "#C79F3D", 
        "secondary-blue": "#73A2B7",
        "neutral-cream": "#F5F5DC",
        "deep-contrast": "#333333",
        success: {
          DEFAULT: "hsl(120, 45%, 45%)",
          light: "hsl(120, 45%, 55%)",
          dark: "hsl(120, 45%, 35%)",
        },
        warning: {
          DEFAULT: "hsl(35, 85%, 55%)",
          light: "hsl(35, 85%, 65%)",
          dark: "hsl(35, 85%, 45%)",
        },
        error: {
          DEFAULT: "hsl(0, 70%, 55%)",
          light: "hsl(0, 70%, 65%)",
          dark: "hsl(0, 70%, 45%)",
        },
        info: {
          DEFAULT: "hsl(210, 85%, 55%)",
          light: "hsl(210, 85%, 65%)",
          dark: "hsl(210, 85%, 45%)",
        },
        neutral: {
          50: "hsl(0, 0%, 98%)",
          100: "hsl(0, 0%, 95%)",
          200: "hsl(220, 14%, 90%)",
          300: "hsl(220, 14%, 80%)",
          400: "hsl(220, 14%, 65%)",
          500: "hsl(220, 14%, 50%)",
          600: "hsl(220, 14%, 40%)",
          700: "hsl(220, 14%, 30%)",
          800: "hsl(220, 14%, 20%)",
          900: "hsl(220, 14%, 10%)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
