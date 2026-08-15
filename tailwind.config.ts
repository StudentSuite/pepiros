import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
  	extend: {
  		colors: {
  			surface: {
  				DEFAULT: 'var(--surface)',
  				raised: 'var(--surface-raised)',
  				sunken: 'var(--surface-sunken)'
  			},
  			paper: {
  				DEFAULT: 'var(--paper)',
  				muted: 'var(--paper-muted)'
  			},
  			ink: {
  				DEFAULT: 'var(--ink)',
  				muted: 'var(--ink-muted)',
  				faint: 'var(--ink-faint)'
  			},
  			border: {
  				DEFAULT: 'var(--border)',
  				strong: 'var(--border-strong)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				text: 'var(--accent-text)',
  				hover: 'var(--accent-hover)',
  				sunk: 'var(--accent-sunk)',
  				wash: 'var(--accent-wash)'
  			},
  			pillar: {
  				'1': 'var(--pillar-1)',
  				'2': 'var(--pillar-2)',
  				'3': 'var(--pillar-3)',
  				'4': 'var(--pillar-4)',
  				'5': 'var(--pillar-5)',
  				'6': 'var(--pillar-6)',
  				'7': 'var(--pillar-7)'
  			},
  			'pillar-text': {
  				'1': 'var(--pillar-1-text)',
  				'2': 'var(--pillar-2-text)',
  				'3': 'var(--pillar-3-text)',
  				'4': 'var(--pillar-4-text)',
  				'5': 'var(--pillar-5-text)',
  				'6': 'var(--pillar-6-text)',
  				'7': 'var(--pillar-7-text)'
  			},
  			located: 'var(--located)',
  			paraphrase: 'var(--paraphrase)',
  			unsupported: 'var(--unsupported)',
  			inference: 'var(--inference)',
  			ungrounded: 'var(--ungrounded)',
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
