import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

// Light mode only (Guidelines doc Section 2). Neutral colours use Tailwind's
// built-in stone palette, brand colours use the built-in orange palette —
// both already match the Guidelines doc's hex values exactly, so no custom
// colour tokens are defined here.
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-inter)', ...fontFamily.sans] },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
}
export default config
