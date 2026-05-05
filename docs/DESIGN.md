# Design System: Memecam.in

## 1. Visual Theme & Atmosphere
A high-energy, high-contrast "Dark Mode" interface designed to make content pop. The atmosphere is "Premium Midnight" — using deep charcoal bases, vibrant neon green accents, and fluid 60fps animations. The layout is asymmetric and bold, mirrors the chaotic energy of meme culture while maintaining professional UI polish.

## 2. Color Palette & Roles
- **Deep Void** (#0A0A0A) — Primary background
- **Steel Surface** (#1A1A1B) — Secondary containers and dropdowns
- **Neon Fire** (#00FF66) — Primary accent (CTAs, Subscribe buttons, Toasts)
- **High White** (#FFFFFF) — Primary headlines and active icons
- **Muted Ghost** (#A1A1AA) — Secondary text, inactive states
- **Danger Red** (#EF4444) — Error states and Delete Account actions
- **Banned**: AI Purple/Blue gradients, Pure Black (#000000) for UI elements (use Deep Void instead).

## 3. Typography Rules
- **Display**: `Outfit` or `Cabinet Grotesk` — Bold, track-tight (-0.02em), uppercase for headlines ("MAKE ANY MOMENT FIRE").
- **Body**: `Satoshi` — Clean, high-legibility sans-serif for descriptions and labels.
- **Mono**: `JetBrains Mono` — For metadata (e.g., "Memecam.in" watermark) and system info.
- **Banned**: Inter, generic system fonts. No serif fonts in this high-tech context.

## 4. Component Stylings
- **Buttons**: Square or slightly rounded (8px). Primary buttons use **Neon Fire** background with black text. Tactile scale-down animation (0.95) on press.
- **Inputs/Dropdowns**: Minimalist borders, glassmorphism overlays for language/style selectors.
- **Cards (Meme Preview)**: Edge-to-edge previews with subtle inner shadows to separate text from background.
- **Loaders**: Pulsing **Neon Fire** ring or a skeleton shimmer that matches the square meme layout.

## 5. Layout Principles
- **Asymmetric Heroes**: Landing screen text is left-aligned and oversized to break symmetry.
- **Mobile-First Gestures**: Use swipe-down to close results and pinch-to-zoom for camera.
- **Spacing**: Generous vertical rhythm using a 4px/8px grid system.

## 6. Motion & Interaction (Reanimated)
- **Spring Physics**: `stiffness: 150, damping: 12` for snappy, high-energy transitions.
- **Entering/Exiting**: Staggered layout animations for the landing screen text.
- **Perpetual Micro-Interactions**: The "FIRE" emoji 🔥 in headlines should have a subtle scale-pulse loop.
- **Slide Transitions**: Horizontal slides between Generator and Result screens.

## 7. Anti-Patterns (Banned)
- No emojis inside documentation/UI except as specific design elements (like the FIRE emoji).
- No 3-column grids; use bold vertical stacks.
- No "Next-Gen" or "Elevate" copywriting; keep it punchy and casual.
- No absolute-positioned overlaps unless for functional overlays (watermarks).
