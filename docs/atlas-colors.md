# Atlas Gold Theme - Color Palette

Reference for the dark gold theme used across Atlas UI screens.

## Core Background

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-base` | `#060606` | Main app background |
| `bg-card` | `#13110e` | Card / panel surfaces |
| `bg-card-alt` | `#11100d` | Alternate card surface |
| `bg-surface` | `#0f0e0b` | Elevated surface |
| `bg-footnote` | `#1a1711` | Footnote strips, subtle surfaces |
| `bg-input` | `#1a1711` | Input field backgrounds |

## Gold Accents

| Token | Hex | Usage |
|-------|-----|-------|
| `gold` | `#d4af37` | Primary gold accent, icons, CTA bg |
| `gold-bright` | `#e0b949` | Brighter gold for labels, active states |
| `gold-muted` | `#d9b248` | Muted gold for tile labels |
| `gold-hover` | `#e0bf4a` | CTA hover state |
| `gold-star` | `#e8c862` | Starfield dots and diamonds |
| `gold-text` | `#f0d98d` | Gold-tinted text |

## Text

| Token | Hex | Usage |
|-------|-----|-------|
| `text-primary` | `#f7eedb` | Primary body text (warm cream) |
| `text-headline` | `#f8efdc` | Headlines, titles |
| `text-body` | `#f3ead8` | Secondary body text |
| `text-muted` | `#d9d1c3` | Muted / supporting text |
| `text-subtle` | `#d8cdb8` | Footnotes, timestamps |
| `text-error` | `#f2a6a6` | Error text |

## Borders

| Token | Opacity | Usage |
|-------|---------|-------|
| `#c8a43a/20` | 20% | Card borders, default |
| `#c8a43a/12` | 12% | Tile dividers, subtle separators |
| `#c8a43a/15` | 15% | Table rows |
| `#d4af37/30` | 30% | Interactive element borders |

## Opacity Patterns

- Labels / small text: `/{75..85}` opacity
- Subtext / muted: `/{50..65}` opacity
- Timestamps: `/{45..55}` opacity
- Disabled / very subtle: `/{30..40}` opacity

## Shadows

| Usage | Value |
|-------|-------|
| Card | `0 30px 80px rgba(0,0,0,0.45)` |
| Panel | `0 18px 50px rgba(0,0,0,0.25)` |
| CTA button | `0 8px 30px rgba(212,175,55,0.25)` |

## Starfield

- Dot color: `#e8c862` (2-4px, rounded)
- Diamond color: `#e8c862` (5-7px, rotated 45deg)
- Glow: `0 0 6-12px rgba(212,175,55, 0.18-0.4)`

## Sidebar

| Token | Hex | Usage |
|-------|-----|-------|
| `sidebar` | `#13110e` | Sidebar background |
| `sidebar-foreground` | `#e8e3dc` | Sidebar primary text |
| `sidebar-primary` | `#c9a227` | Gold accent — active icons, rings, indicators |
| `sidebar-primary-foreground` | `#13110e` | Text on filled gold elements |
| `sidebar-accent` | `#2a2520` | Button/icon backgrounds, hover surfaces |
| `sidebar-accent-foreground` | `#e8e3dc` | Text on accent surfaces |
| `sidebar-border` | `#2a2520` | Separator lines, dividers |
| `sidebar-ring` | `#c9a227` | Focus rings |
| `sidebar-muted` | `#5a5550` | Inactive nav text and icon color |
| `sidebar-hover` | `#35302a` | Button hover state |
| `sidebar-inactive-border` | `#3a3530` | Inactive nav circle borders |
| `sidebar-inactive-icon` | `#4a4540` | Collapsed inactive icon color |

## Background Glow

```
radial-gradient(ellipse 60% 50% at 50% 20%, rgba(212,175,55,0.08), transparent 60%)
```
