---
name: Cognitive Nexus
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#005b7c'
  on-tertiary: '#ffffff'
  tertiary-container: '#00759f'
  on-tertiary-container: '#e1f2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The brand personality is authoritative yet accessible, positioned as a sophisticated gateway to the complex world of artificial intelligence. It targets developers, researchers, and tech-savvy professionals who require a reliable, high-performance interface to discover and monitor AI models and tools.

The design style is **Corporate / Modern** with a lean toward **Minimalism**. It emphasizes clarity through generous whitespace, a disciplined color palette, and high-quality typography. The aesthetic should evoke feelings of intelligence, precision, and futuristic efficiency without the visual noise often found in experimental tech platforms. The interface relies on structural integrity and subtle depth to guide the user through large datasets.

## Colors
This design system utilizes a structured blue-scale palette to establish hierarchy and trust. 

- **Primary (Royal Blue):** Used for primary actions, active states, and brand-critical elements.
- **Secondary (Slate Blue):** Applied to secondary navigation, iconography, and supporting text to provide professional contrast.
- **Tertiary (Soft Light Blue):** Reserved for accent backgrounds, highlights, and informational status indicators.
- **Neutral:** A range of light grays and whites to maintain high readability and a clean surface structure.

Surface backgrounds use a very light gray (#F8FAFC) to differentiate from pure white (#FFFFFF) card components, creating a subtle layered effect.

## Typography
The typography system uses **Inter** as the primary typeface for its exceptional legibility and systematic feel. For technical metadata, status indicators, and code-related labels, **JetBrains Mono** is used to reinforce the "AI/Tech" narrative.

Headlines should utilize tighter letter-spacing and heavier weights to command attention. Body text remains neutral and open for long-form readability. The use of a monospaced font for labels provides a sharp, functional contrast to the humanist curves of the sans-serif body.

## Layout & Spacing
The design system follows a **Fixed Grid** model for desktop and a **Fluid Grid** for mobile devices. 

- **Desktop:** A 12-column grid with a 1280px maximum container width. Gutters are fixed at 24px to ensure content separation in data-heavy views.
- **Tablet:** 8-column grid with 24px margins.
- **Mobile:** 4-column fluid grid with 16px horizontal margins.

Spacing follows a 4px base unit. Vertical rhythm is maintained using standardized "stack" tokens (8px, 16px, 32px) to ensure consistent grouping of related elements within cards and layouts.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Ambient Shadows**. The background surface is kept at a lower tonal value (Neutral #F8FAFC), while interactive elements like cards are elevated using pure white surfaces.

Shadows are used sparingly and should be highly diffused.
- **Level 1 (Cards):** 0px 2px 4px rgba(0, 0, 0, 0.05).
- **Level 2 (Hover/Dropdowns):** 0px 10px 15px -3px rgba(0, 0, 0, 0.1).
- **Level 3 (Modals):** 0px 20px 25px -5px rgba(0, 0, 0, 0.1).

Border strokes are ultra-thin (1px) and use a low-contrast color (#E2E8F0) to define boundaries without adding visual weight.

## Shapes
The shape language is defined by a "Rounded" philosophy to soften the technical nature of the content. 

- **Small elements (Buttons, Inputs, Tags):** 0.5rem (8px).
- **Medium elements (Cards, Modals):** 1rem (16px).
- **Large elements (Featured Banners):** 1.5rem (24px).

This consistency in curvature creates a cohesive, modern container system that feels approachable yet structured.

## Components
- **Station Cards:** Feature a 16px corner radius. Include a top-right "status indicator" (a 8px dot with a subtle pulse animation for "online"). Title in `headline-md`, metadata in `label-sm`.
- **Search Bars:** High-affordance, 48px height, with a 1px border. Use the Primary Blue for the focus ring.
- **Category Filters:** Utilize "Pill" shapes for inactive states and Primary Blue backgrounds for active states. Use `label-md` for text.
- **Buttons:** 
    - *Primary:* Solid Royal Blue with white text. 
    - *Secondary:* Ghost style with Slate Blue border and text.
- **Bookmark Buttons:** Circular iconography buttons (32x32px) that transition from an outline to a solid Slate Blue when active.
- **Status Indicators:** 
    - *Online:* Primary Blue or Emerald Green pulse.
    - *Latency:* Expressed in `label-sm` monospaced text (e.g., "120ms").
- **Input Fields:** Soft gray background (#F1F5F9) that transitions to white on focus with a 2px Royal Blue border.