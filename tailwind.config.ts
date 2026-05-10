import type { Config } from "tailwindcss";
import { fontSize } from "./src/design-system/tokens/typography";
import { semanticSpacing } from "./src/design-system/tokens/spacing";

function flattenSpacing(spacing: typeof semanticSpacing) {
  const result: Record<string, string> = {};
  for (const group of Object.keys(spacing) as Array<keyof typeof spacing>) {
    for (const key of Object.keys(spacing[group]) as Array<keyof typeof spacing[typeof group]>) {
      result[`${group}-${key}`] = spacing[group][key];
    }
  }
  return result;
}

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
		fontSize,
  		spacing: {
  			'30': '7.5rem',
                ...flattenSpacing(semanticSpacing)
  		},
  		width: {
  			'95vw': '95vw'
  		},
  		maxHeight: {
  			'85vh': '85vh'
  		},
  		minWidth: {
  			'120': '7.5rem'
  		},
  		zIndex: {
  			base: '0',
  			docked: '10',
  			focus: '20',
  			fab: '30',
  			overlay: '40',
  			modal: '50',
  			max: '999'
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			trend: {
  				improving: 'hsl(var(--trend-improving))',
  				'improving-foreground': 'hsl(var(--trend-improving-foreground))',
  				stable: 'hsl(var(--trend-stable))',
  				'stable-foreground': 'hsl(var(--trend-stable-foreground))',
  				stagnant: 'hsl(var(--trend-stagnant))',
  				'stagnant-foreground': 'hsl(var(--trend-stagnant-foreground))',
  				deteriorating: 'hsl(var(--trend-deteriorating))',
  				'deteriorating-foreground': 'hsl(var(--trend-deteriorating-foreground))'
  			},
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
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			'fade-in-scale': {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.96)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			'slide-up': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(16px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out both',
  			'fade-in-scale': 'fade-in-scale 0.25s ease-out both',
  			'slide-up': 'slide-up 0.35s ease-out both'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
