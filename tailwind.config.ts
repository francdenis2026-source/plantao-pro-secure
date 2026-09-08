import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Libre Baskerville', 'Georgia', 'serif'],
        serif: ['Libre Baskerville', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        heading: ['"Space Grotesk"', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-scale": {
          "0%": { opacity: "0", transform: "scale(0.95) translateY(10px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "tactical-slide": {
          "0%": { opacity: "0", transform: "translateX(-20px) skewX(-2deg)" },
          "100%": { opacity: "1", transform: "translateX(0) skewX(0)" },
        },
        "tactical-reveal": {
          "0%": { opacity: "0", clipPath: "inset(0 100% 0 0)" },
          "100%": { opacity: "1", clipPath: "inset(0 0 0 0)" },
        },
        "tactical-pulse": {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.4)" },
          "70%": { boxShadow: "0 0 0 8px hsl(var(--primary) / 0)" },
          "100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)", opacity: "0.5" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(100%)", opacity: "0.5" },
        },
        "rise": {
          "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
          "100%": { transform: "translateY(-100vh) scale(0.5)", opacity: "0" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "hsl(var(--primary) / 0.3)" },
          "50%": { borderColor: "hsl(var(--primary) / 0.8)" },
        },
        "text-glow": {
          "0%, 100%": { textShadow: "0 0 10px hsl(var(--primary) / 0.5)" },
          "50%": { textShadow: "0 0 20px hsl(var(--primary) / 0.9), 0 0 40px hsl(var(--primary) / 0.5)" },
        },
        "radar-sweep": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "electric-pulse": {
          "0%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.02)" },
          "100%": { opacity: "0.4", transform: "scale(1)" },
        },
        "holographic": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "slide-in-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "zoom-in": {
          "0%": { opacity: "0", transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "glow-intense": {
          "0%, 100%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.1)" },
          "50%": { boxShadow: "0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.2)" },
        },
        "status-online": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(142 76% 36% / 0.7)" },
          "50%": { boxShadow: "0 0 0 6px hsl(142 76% 36% / 0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-scale": "fade-in-scale 0.5s ease-out forwards",
        "tactical-slide": "tactical-slide 0.4s ease-out forwards",
        "tactical-reveal": "tactical-reveal 0.6s ease-out forwards",
        "tactical-pulse": "tactical-pulse 1.5s ease-out",
        "scan-line": "scan-line 2s ease-in-out infinite",
        "rise": "rise 5s ease-out infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "text-glow": "text-glow 2.5s ease-in-out infinite",
        "radar-sweep": "radar-sweep 4s linear infinite",
        "electric-pulse": "electric-pulse 2s ease-in-out infinite",
        "holographic": "holographic 6s ease infinite",
        "slide-in-up": "slide-in-up 0.6s ease-out forwards",
        "slide-in-left": "slide-in-left 0.5s ease-out forwards",
        "slide-in-right": "slide-in-right 0.5s ease-out forwards",
        "zoom-in": "zoom-in 0.4s ease-out forwards",
        "glow-intense": "glow-intense 3s ease-in-out infinite",
        "status-online": "status-online 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
      },
      boxShadow: {
        glow: "0 0 40px hsl(187 85% 53% / 0.15)",
        card: "0 8px 32px hsl(0 0% 0% / 0.3)",
        soft: "0 4px 16px hsl(0 0% 0% / 0.2)",
        "glow-primary": "0 0 30px hsl(187 85% 53% / 0.3)",
        "glow-amber": "0 0 30px hsl(38 92% 50% / 0.3)",
        "glow-emerald": "0 0 30px hsl(142 76% 36% / 0.3)",
        "glow-purple": "0 0 30px hsl(280 85% 53% / 0.3)",
        "tactical": "0 4px 20px hsl(0 0% 0% / 0.4), inset 0 1px 0 hsl(0 0% 100% / 0.05)",
        "tactical-hover": "0 8px 30px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
