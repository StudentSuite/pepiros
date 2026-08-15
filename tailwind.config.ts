import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
  	extend: {
  		colors: {
  			surface: {
  				DEFAULT: 'rgb(var(--surface-rgb) / <alpha-value>)',
  				raised: 'rgb(var(--surface-raised-rgb) / <alpha-value>)',
  				sunken: 'rgb(var(--surface-sunken-rgb) / <alpha-value>)'
  			},
  			paper: {
  				DEFAULT: 'rgb(var(--paper-rgb) / <alpha-value>)',
  				muted: 'rgb(var(--paper-muted-rgb) / <alpha-value>)'
  			},
  			ink: {
  				DEFAULT: 'rgb(var(--ink-rgb) / <alpha-value>)',
  				muted: 'rgb(var(--ink-muted-rgb) / <alpha-value>)',
  				faint: 'rgb(var(--ink-faint-rgb) / <alpha-value>)'
  			},
  			border: {
  				DEFAULT: 'rgb(var(--border-rgb) / <alpha-value>)',
  				strong: 'rgb(var(--border-strong-rgb) / <alpha-value>)'
  			},
  			accent: {
  				DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
  				text: 'rgb(var(--accent-text-rgb) / <alpha-value>)',
  				hover: 'rgb(var(--accent-hover-rgb) / <alpha-value>)',
  				sunk: 'rgb(var(--accent-sunk-rgb) / <alpha-value>)',
  				wash: 'var(--accent-wash)'
  			},
  			pillar: {
  				'1': 'rgb(var(--pillar-1-rgb) / <alpha-value>)',
  				'2': 'rgb(var(--pillar-2-rgb) / <alpha-value>)',
  				'3': 'rgb(var(--pillar-3-rgb) / <alpha-value>)',
  				'4': 'rgb(var(--pillar-4-rgb) / <alpha-value>)',
  				'5': 'rgb(var(--pillar-5-rgb) / <alpha-value>)',
  				'6': 'rgb(var(--pillar-6-rgb) / <alpha-value>)',
  				'7': 'rgb(var(--pillar-7-rgb) / <alpha-value>)'
  			},
  			'pillar-text': {
  				'1': 'rgb(var(--pillar-1-text-rgb) / <alpha-value>)',
  				'2': 'rgb(var(--pillar-2-text-rgb) / <alpha-value>)',
  				'3': 'rgb(var(--pillar-3-text-rgb) / <alpha-value>)',
  				'4': 'rgb(var(--pillar-4-text-rgb) / <alpha-value>)',
  				'5': 'rgb(var(--pillar-5-text-rgb) / <alpha-value>)',
  				'6': 'rgb(var(--pillar-6-text-rgb) / <alpha-value>)',
  				'7': 'rgb(var(--pillar-7-text-rgb) / <alpha-value>)'
  			},
  			located: 'rgb(var(--located-rgb) / <alpha-value>)',
  			paraphrase: 'rgb(var(--paraphrase-rgb) / <alpha-value>)',
  			unsupported: 'rgb(var(--unsupported-rgb) / <alpha-value>)',
  			inference: 'rgb(var(--inference-rgb) / <alpha-value>)',
  			ungrounded: 'rgb(var(--ungrounded-rgb) / <alpha-value>)',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			subtle: {
  				DEFAULT: 'hsl(var(--subtle))',
  				foreground: 'hsl(var(--subtle-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		fontFamily: {
  			serif: [
  				'var(--font-serif)',
  				'Georgia',
  				'serif'
  			],
  			sans: [
  				'var(--font-grotesque)',
  				'system-ui',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-mono)',
  				'ui-monospace',
  				'monospace'
  			]
  		},
  		spacing: {
  			's-1': 'var(--s-1)',
  			's-2': 'var(--s-2)',
  			's-3': 'var(--s-3)',
  			's-4': 'var(--s-4)',
  			's-5': 'var(--s-5)',
  			's-6': 'var(--s-6)',
  			's-7': 'var(--s-7)',
  			's-8': 'var(--s-8)',
  			rail: 'var(--rail-left)',
  			'panel-papers': 'var(--panel-papers)',
  			inspector: 'var(--inspector)',
  			'chat-collapsed': 'var(--chat-collapsed)',
  			'chat-open': 'var(--chat-open)',
  			topbar: 'var(--topbar)'
  		},
  		borderRadius: {
  			DEFAULT: 'var(--r-md)',
  			sm: 'var(--r-sm)',
  			md: 'var(--r-md)',
  			lg: 'var(--r-lg)',
  			xl: 'var(--r-xl)',
  			full: 'var(--r-full)'
  		},
  		boxShadow: {
  			'e-1': 'var(--e-1)',
  			'e-2': 'var(--e-2)',
  			'e-3': 'var(--e-3)',
  			'glow-accent': 'var(--glow-accent)'
  		},
  		transitionDuration: {
  			fast: 'var(--dur-fast)',
  			base: 'var(--dur-base)',
  			slow: 'var(--dur-slow)',
  			canvas: 'var(--dur-canvas)'
  		},
  		transitionTimingFunction: {
  			out: 'var(--ease-out)',
  			inout: 'var(--ease-inout)',
  			spring: 'var(--ease-spring)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
