import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
  	// ---- radius (issue #393) --------------------------------------------
  	// NOT in `extend`, deliberately. This REPLACES Tailwind's radius scale
  	// instead of merging with it.
  	//
  	// The scale used to sit in `extend` and mapped sm/md/lg/xl/full to the
  	// tokens, which left Tailwind's own `2xl` (1rem) and `3xl` (1.5rem)
  	// still resolving underneath: two off-scale radii available by accident,
  	// sitting between xl (20px) and nothing. design/anti-slop.md names
  	// `rounded-2xl` specifically as an AI-slop tell.
  	//
  	// MEASURED BEFORE CHANGING: `rounded-2xl` and `rounded-3xl` have ZERO
  	// occurrences across app/ and components/. The full census is
  	// rounded-full 101, rounded-md 88, rounded-lg 51, rounded-sm 14,
  	// rounded-xl 9, rounded-none 3. Every radius in the codebase was already
  	// on-scale, so this was a latent gap rather than an active defect, and
  	// closing it needs no call-site sweep and carries no visual change.
  	//
  	// `none` is kept because rounded-none has 3 real call sites. Anything
  	// outside this list now fails to resolve, which is the point.
  	borderRadius: {
  		none: '0px',
  		DEFAULT: 'var(--r-md)',
  		sm: 'var(--r-sm)',
  		md: 'var(--r-md)',
  		lg: 'var(--r-lg)',
  		xl: 'var(--r-xl)',
  		full: 'var(--r-full)'
  	},
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
  			// The dispersion palette. `accent` above (violet, since
  			// 2026-08-23) is the primary interactive colour -- see THE ACCENT
  			// RULE at the top of app/globals.css. Amber/green/bone stay real,
  			// legal UI accents for secondary/decorative use; raw `disp.violet`
  			// itself is not used as a text-bearing fill (fails AA at 3.06:1
  			// against --paper), which is why `accent` is its own derivation
  			// rather than pointing here.
  			disp: {
  				amber: 'rgb(var(--disp-amber-rgb) / <alpha-value>)',
  				green: 'rgb(var(--disp-green-rgb) / <alpha-value>)',
  				violet: 'rgb(var(--disp-violet-rgb) / <alpha-value>)',
  				bone: 'rgb(var(--disp-bone-rgb) / <alpha-value>)'
  			},
  			// One call site by design: components/ui/Logo.tsx. Kept out of the
  			// accent scale so it cannot be reached for by accident.
  			'logo-quote-bar': 'var(--logo-quote-bar)',
  			// Theme-invariant on purpose: a lockup's treatment is chosen by the
  			// ground it sits on, not by the reader's colour scheme.
  			'brand-ink': 'rgb(var(--brand-ink-rgb) / <alpha-value>)',
  			'brand-ink-reversed': 'rgb(var(--brand-ink-reversed-rgb) / <alpha-value>)',
  			// Theme-invariant, like brand-ink above. One call site by design:
  			// components/chrome/Band.tsx. It tracks the atmosphere ramp's
  			// ground stop, NOT a surface token, so it is deliberately not
  			// reachable from the surface scale.
  			'band-scrim': 'rgb(var(--band-scrim-rgb) / <alpha-value>)',
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
  			// --font-serif is Source Serif 4 and is for LONG-FORM ARTICLE BODY
  			// COPY ONLY: never the wordmark, never a heading, never UI chrome.
  			serif: [
  				'var(--font-serif)',
  				'Georgia',
  				'serif'
  			],
  			// --font-grotesque is Geist (was Inter). All UI, headlines, nav,
  			// buttons, labels, and the wordmark.
  			sans: [
  				'var(--font-grotesque)',
  				'system-ui',
  				'sans-serif'
  			],
  			// --font-mono is Geist Mono (was JetBrains Mono). Citation IDs,
  			// evidence chips, DOIs, computed figures, and the .kicker eyebrow.
  			mono: [
  				'var(--font-mono)',
  				'ui-monospace',
  				'monospace'
  			]
  		},
  		// ---- type scale (issue #351) -------------------------------------
  		// This key did not exist. Every other axis of the system was
  		// tokenized and enforced; type was not, so 60+ call sites reached for
  		// arbitrary `text-[13px]` / `text-[15px]` / `text-[10px]` because
  		// there was no token to reach for instead. Pixel font sizes do not
  		// respond to the browser's own text-size setting, which is what made
  		// this an accessibility problem and not just an inconsistency.
  		//
  		// AUTHORED IN REM, deliberately, at a 16px root. A user who sets a
  		// larger default text size now scales every one of these.
  		//
  		// The existing Tailwind names keep their existing values, so nothing
  		// currently using text-xs / text-sm / text-base / text-lg and up
  		// changes appearance. Only `2xs` is new.
  		//
  		// CONVERSION TABLE for issue #352, which does the call-site sweep:
  		//     text-[9px], text-[10px], text-[11px]  ->  text-2xs
  		//     text-[13px]                           ->  text-sm  (or xs when dense)
  		//     text-[14px]                           ->  text-sm
  		//     text-[15px], text-[16px]              ->  text-base
  		// 13px and 15px are half-steps and do not survive. A scale exists to
  		// remove half-steps; keeping them would just re-create the problem
  		// with token names on it.
  		//
  		// 2xs at 11px is the FLOOR (issue #353). Nothing renders smaller.
  		// The 9px in SynthesisNode and the 10px mono eyebrows both land here.
  		fontSize: {
  			'2xs': ['0.6875rem', { lineHeight: '1rem' }],      // 11px  mono eyebrow, chips, meta
  			xs: ['0.75rem', { lineHeight: '1rem' }],           // 12px  captions, dense cells
  			sm: ['0.875rem', { lineHeight: '1.25rem' }],       // 14px  secondary body, form hints
  			base: ['1rem', { lineHeight: '1.5rem' }],          // 16px  body
  			lg: ['1.125rem', { lineHeight: '1.75rem' }],       // 18px
  			xl: ['1.25rem', { lineHeight: '1.75rem' }],        // 20px
  			'2xl': ['1.5rem', { lineHeight: '2rem' }],         // 24px
  			'3xl': ['1.875rem', { lineHeight: '2.25rem' }],    // 30px
  			'4xl': ['2.25rem', { lineHeight: '2.5rem' }],      // 36px
  			'5xl': ['3rem', { lineHeight: '1' }],              // 48px
  			'6xl': ['3.75rem', { lineHeight: '1' }],           // 60px
  			'7xl': ['4.5rem', { lineHeight: '1' }]             // 72px
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
  		// ---- stacking order (issue #370) ---------------------------------
  		// Eleven ad-hoc layers were in use with no scale and no written
  		// ordering, which is how MobileNav and the toaster ended up tied at
  		// z-[60] (#371) and the skip link ended up below both (#373).
  		// Definitions and the ordering rationale live in app/globals.css.
  		zIndex: {
  			raised: 'var(--z-raised)',
  			sticky: 'var(--z-sticky)',
  			header: 'var(--z-header)',
  			dock: 'var(--z-dock)',
  			overlay: 'var(--z-overlay)',
  			nav: 'var(--z-nav)',
  			toast: 'var(--z-toast)',
  			banner: 'var(--z-banner)',
  			skip: 'var(--z-skip)'
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
