# Poster Design Vocabulary

Version: 1.0.0

## Purpose

This vocabulary is the design grammar used by the Poster Skill. It separates **design decisions** from vague style prompts.

Instead of asking an agent to "make a modern poster", the agent should produce a Design DNA object containing:

- composition
- grid
- visual hierarchy
- typography
- color strategy
- imagery
- graphic language
- texture
- depth
- motion
- interaction
- density
- negative space
- materiality
- branding
- design tension
- constraints

## Design decision order

Use this order when generating a poster:

1. Parse the brief.
2. Select 2–4 design movements or references.
3. Generate a Design DNA.
4. Validate the DNA against `compatibility.json`.
5. Render the poster.
6. Run a design critic.
7. If the AI-aesthetic risk is high or the design score is low, revise the DNA before rendering again.

## Numeric conventions

Most numeric fields use `0..1`.

- `0` = none / minimum
- `0.5` = medium
- `1` = maximum

For tension axes, `0` means the first concept and `1` means the second concept.

Example:

`order_vs_chaos = 0.8` means strongly chaotic.

## Core principles

### 1. Style is not enough

Do not use "Swiss", "Brutalist", "Editorial", or "Cyberpunk" as the complete design specification.

A style label is an inspiration source. The actual render should be controlled by concrete vocabulary.

### 2. Color is a strategy

Prefer:

- monochrome
- duotone
- neutral + accent
- black + accent
- restrained complementary palettes

Avoid defaulting to purple/cyan/pink gradients, glow, and particles.

### 3. Every graphic element needs a reason

Use `graphic_language.symbolism` to distinguish:

- `decorative`
- `semantic`
- `functional`
- `ambiguous`

For professional posters, meaningless decoration should be minimized.

### 4. Introduce tension

Strong poster design often combines opposing forces:

- order vs chaos
- precision vs imperfection
- minimalism vs density
- static vs dynamic
- legibility vs expression
- digital vs physical

Use `design_tension` to make these conflicts explicit.

### 5. Interaction should be semantic

Do not add motion simply because the poster is interactive.

Interaction should reinforce the concept:

- music → rhythm / kinetic movement
- fashion → subtle parallax / image reveal
- exhibition → information expansion
- technology → responsive diagrams
- editorial → scroll-based composition changes

## Suggested generation pipeline

```text
Brief
  ↓
Design Director
  ↓
Design DNA
  ↓
Compatibility Check
  ↓
Visual Asset Generation
  ↓
Layout Engine
  ↓
Motion / Interaction Engine
  ↓
Render
  ↓
Design Critic
  ↓
Iterate
```

## Recommended anti-AI defaults

Unless explicitly requested, avoid combinations that commonly produce generic AI aesthetics:

- purple + cyan + pink gradients
- excessive glow
- floating particles
- generic glassmorphism
- meaningless technical grids
- excessive rounded cards
- centered hero + centered title for every design
- decorative elements without semantic purpose

Instead, introduce controlled variation through:

- asymmetry
- physical print artifacts
- unusual but restrained color accents
- broken grids
- aggressive cropping
- typography-led compositions
- editorial density
- material textures
- intentional imperfection
- meaningful interaction

## Example Design DNA

```json
{
  "design_vocabulary": {
    "design_movements": ["experimental_editorial"],
    "composition": {
      "structure": "broken_grid",
      "orientation": "portrait",
      "focal_point": "upper_left",
      "visual_axis": "diagonal",
      "balance": "dynamic",
      "symmetry": 0.15,
      "edge_tension": 0.82,
      "cropping": "aggressive",
      "layering": "deep",
      "overlap": 0.65,
      "alignment": ["left_edge", "baseline"]
    },
    "grid": {
      "type": "12_column",
      "columns": 12,
      "rows": 8,
      "gutter": "medium",
      "margin": "tight",
      "baseline_grid": true,
      "alignment_mode": "mixed",
      "grid_visibility": 0,
      "break_grid": 0.72
    },
    "typography": {
      "category": "condensed",
      "width": "condensed",
      "weight": "black",
      "contrast": "low",
      "case": "uppercase",
      "tracking": "tight",
      "leading": "tight",
      "scale": "extreme",
      "alignment": "left",
      "orientation": "horizontal",
      "distortion": 0.2,
      "cropping": 0.65,
      "layering": "overlap",
      "variable_font": true
    },
    "color": {
      "strategy": "black_and_accent",
      "temperature": "neutral",
      "saturation": 0.38,
      "contrast": 0.91,
      "brightness": 0.31,
      "dominant_ratio": 0.78,
      "accent_ratio": 0.08,
      "accent_count": 1,
      "gradient": false,
      "palette": ["#111111", "#E8E5DC", "#FF3B30"],
      "ai_aesthetic_risk": 0.08
    }
  }
}
```

## Agent rules

The agent should:

1. Never collapse the entire design into one style keyword.
2. Prefer 2–4 strong design decisions over many weak decorative effects.
3. Use compatibility rules before rendering.
4. Treat color, typography, composition, and grid as first-class decisions.
5. Prefer semantic interaction over ornamental animation.
6. Keep anti-pattern detection active unless the user explicitly asks for an anti-pattern aesthetic.
