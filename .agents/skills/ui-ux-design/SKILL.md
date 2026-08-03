---
name: ui-ux-design
description: Standardized UI/UX Frontend Design System featuring modern visual aesthetics, dark mode themes, typography, dynamic micro-animations, glassmorphism, responsive layouts, and cross-framework component directives (React, Vite, Tailwind, Vanilla CSS, Flutter).
---

# UI/UX Frontend Design System & Directive

This skill defines the mandatory UI/UX design standards, visual aesthetic guidelines, color systems, typography scale, micro-animations, component patterns, and responsiveness rules for all web and mobile frontend applications in this workspace and across projects.

---

## 1. Core Design Philosophy & Aesthetic Standards

1. **"WOW" First Impression**: Every screen must look premium, modern, clean, and polished at first glance. Generic, default, or unstyled UI components (plain blue links, standard browser buttons, unrounded cards) are **STRICTLY PROHIBITED**.
2. **Visual Hierarchy & Contrast**: Emphasize key actions and data using deliberate sizing, font weights, and accent colors. Secondary elements should recede gracefully into the background.
3. **Glassmorphism & Layering**: Use translucent surfaces, subtle borders, and layered drop-shadows to establish physical depth (`backdrop-filter: blur(12px)`).
4. **Motion & Dynamic Micro-Animations**: Every interactive component (buttons, cards, inputs, dropdowns) must provide smooth hover, active, and focus transitions (e.g. `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`).

---

## 2. Color System & Palette Directives

Never use raw default CSS colors (`#ff0000`, `blue`, `gray`). Always define CSS Custom Properties (Variables) or Tailwind theme colors.

### Dark Mode (Primary Palette)
- **Background Deep**: `hsl(224, 25%, 8%)` (`#0f131d`)
- **Background Surface (Card/Modal)**: `hsl(222, 20%, 12%)` (`#181e2a`)
- **Background Elevated / Hover**: `hsl(220, 18%, 18%)` (`#242b3b`)
- **Border Overlay**: `hsla(220, 20%, 80%, 0.12)`
- **Primary Brand / Accent**: `hsl(250, 84%, 67%)` (`#6366f1` / Indigo-Violet)
- **Primary Gradient**: `linear-gradient(135deg, #6366f1 0%, #a855f7 100%)`
- **Secondary Accent**: `hsl(190, 90%, 50%)` (`#06b6d4` / Cyan)
- **Text Primary**: `hsl(210, 40%, 98%)` (`#f8fafc`)
- **Text Secondary**: `hsl(215, 20%, 65%)` (`#94a3b8`)
- **Text Muted**: `hsl(215, 16%, 47%)` (`#64748b`)
- **Status Success**: `hsl(142, 76%, 45%)` (`#22c55e`)
- **Status Warning**: `hsl(38, 92%, 50%)` (`#f59e0b`)
- **Status Danger**: `hsl(346, 84%, 61%)` (`#f43f5e`)

### Light Mode (Adaptive Palette)
- **Background Light**: `hsl(210, 40%, 98%)` (`#f8fafc`)
- **Surface Card**: `hsl(0, 0%, 100%)` (`#ffffff`)
- **Border Soft**: `hsl(214, 32%, 91%)` (`#e2e8f0`)
- **Text Dark**: `hsl(222, 47%, 11%)` (`#0f172a`)

---

## 3. Typography & Scale

Default browser fonts are disabled. Always import and apply modern sans-serif typefaces (e.g. **Outfit**, **Inter**, or **Plus Jakarta Sans** via `@fontsource` or Google Fonts).

### Font Scale Hierarchy
| Level | Desktop Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- |
| **Display 1** | 2.5rem (40px) | 700 (Bold) | 1.15 | `-0.02em` |
| **Heading 1** | 1.875rem (30px) | 700 (Bold) | 1.2 | `-0.015em` |
| **Heading 2** | 1.5rem (24px) | 600 (SemiBold) | 1.3 | `-0.01em` |
| **Heading 3** | 1.25rem (20px) | 600 (SemiBold) | 1.35 | `0` |
| **Body Large** | 1.125rem (18px) | 400 / 500 | 1.5 | `0` |
| **Body Normal** | 1rem (16px) | 400 | 1.5 | `0` |
| **Body Small** | 0.875rem (14px) | 400 / 500 | 1.4 | `0.01em` |
| **Caption/Tag** | 0.75rem (12px) | 600 (Upper) | 1.3 | `0.05em` |

---

## 4. Spacing, Layout & Responsive Grid

- **8px Spatial System**: All padding, margins, and layout dimensions must be multiples of 4px / 8px (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- **Border Radius Standards**:
  - Buttons / Inputs: `8px` - `12px` (`rounded-lg` / `rounded-xl`)
  - Cards / Containers: `16px` - `20px` (`rounded-2xl`)
  - Modals / Badges: `24px` or Full Pill (`rounded-3xl` / `rounded-full`)
- **Responsive Breakpoints**:
  - `sm`: `640px` (Mobile landscape / small tablet)
  - `md`: `768px` (Tablet)
  - `lg`: `1024px` (Laptop / Desktop)
  - `xl`: `1280px` (Large display)
  - `2xl`: `1536px` (Ultra-wide)

---

## 5. UI Component Rules & Design Specifications

### 5.1 Buttons
- Primary buttons must use vibrant background gradients or strong brand colors with hover scale/glow effects (`transform: translateY(-1px)`).
- Secondary buttons should use subtle borders and transparent/glass backgrounds.
- Always include explicit `:hover`, `:active`, `:focus-visible`, and `disabled` states.
- Loading states must display animated spinners (`lucide-react` or CSS keyframe spin).

### 5.2 Cards & Panels
- Backdrop filter blur: `backdrop-filter: blur(12px)`.
- Borders: `1px solid rgba(255, 255, 255, 0.08)` in dark mode.
- Box Shadows: Smooth multi-layered shadow (`0 10px 30px -10px rgba(0, 0, 0, 0.5)`).

### 5.3 Form Controls & Inputs
- Inputs must feature clear floating labels or crisp placeholder text.
- Focus state: Highlight with accent color border + glow ring (`box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25)`).
- Error state: Crisp red indicator with inline validation message.

### 5.4 Data Visualization & Tables
- Sticky header rows for tabular data.
- Alternating row zebra striping or subtle hover row highlights.
- Clear status badges (`rounded-full`, pill style with dot indicators).

---

## 6. Framework Specific Adaptation Instructions

### 6.1 React / Vite (Web App - `apps/web`)
1. Use `@fontsource/outfit` or Inter for fonts.
2. Use `lucide-react` icons exclusively for crisp SVG rendering.
3. Organize modular styles or CSS variables inside `src/index.css` or Tailwind config.
4. Smooth view transition routing and animated page wrappers.

### 6.2 Tailwind CSS Integration
1. Extend `theme.colors` with dark surface scale (`slate-900`, `indigo-600`, `cyan-500`).
2. Add custom utility classes for glassmorphism (`glass-card`, `glass-nav`, `gradient-text`).

### 6.3 Flutter / Mobile Integration (`apps/mobile`)
*(Note: Observe strict mobile modification rules unless requested by user)*
1. Maintain unified `AppTheme` with custom `ThemeData.dark()`.
2. Use `GoogleFonts.outfitTextTheme()`.
3. Wrap cards with `ClipRRect` and `BackdropFilter` for blur UI.

---

## 7. Skill Activation Directive across Projects

To apply this UI/UX Design system in any project in this workspace:
1. Ensure `AGENTS.md` triggers `ui-ux-design` for all UI development tasks.
2. Refer to design tokens in `apps/web/src/index.css` or global styles.
3. Validate visual aesthetics, responsiveness, and dark mode contrast prior to concluding UI work.
