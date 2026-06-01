import formsPlugin from "@tailwindcss/forms";
import animatePlugin from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  plugins: [formsPlugin, animatePlugin],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
   			colors: {
   			background: 'var(--background)',
   			foreground: 'var(--foreground)',
   			card: {
   				DEFAULT: 'var(--card)',
   				foreground: 'var(--card-foreground)'
   			},
   			popover: {
   				DEFAULT: 'var(--popover)',
   				foreground: 'var(--popover-foreground)'
   			},
   			primary: {
   				DEFAULT: 'var(--primary)',
   				foreground: 'var(--primary-foreground)'
   			},
   			secondary: {
   				DEFAULT: 'var(--secondary)',
   				foreground: 'var(--secondary-foreground)'
   			},
   			muted: {
   				DEFAULT: 'var(--muted)',
   				foreground: 'var(--muted-foreground)'
   			},
   			accent: {
   				DEFAULT: 'var(--accent)',
   				foreground: 'var(--accent-foreground)'
   			},
   			destructive: {
   				DEFAULT: 'var(--destructive)',
   				foreground: 'var(--destructive-foreground)'
   			},
   			border: 'var(--border)',
   			input: 'var(--input)',
   			ring: 'var(--ring)',
   			chart: {
   				'1': 'var(--chart-1)',
   				'2': 'var(--chart-2)',
   				'3': 'var(--chart-3)',
   				'4': 'var(--chart-4)',
   				'5': 'var(--chart-5)'
   			},
         game: {
           border: 'var(--game-border)',
           hidden: 'var(--game-hidden)',
           revealed: 'var(--game-revealed)',
           button: 'var(--game-button)',
           hover: 'var(--game-hover)',
           explodedmine: 'var(--game-explodedmine)',
           wrongflag: 'var(--game-wrongflag)',
           redborder: 'var(--game-redborder)',
           blueborder: 'var(--game-blueborder)',
           number: {
             '1': 'var(--game-number-1)',
             '2': 'var(--game-number-2)',
             '3': 'var(--game-number-3)',
             '4': 'var(--game-number-4)',
             '5': 'var(--game-number-5)',
             '6': 'var(--game-number-6)',
             '7': 'var(--game-number-7)',
             '8': 'var(--game-number-8)',
             '0': 'var(--game-number-0)',
             '-1': 'var(--game-number--1)',
             '-2': 'var(--game-number--2)',
             '-3': 'var(--game-number--3)',
             '-4': 'var(--game-number--4)',
             '-5': 'var(--game-number--5)',
             '-6': 'var(--game-number--6)',
             '-7': 'var(--game-number--7)',
             '-8': 'var(--game-number--8)',
           }
         },
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
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
};
