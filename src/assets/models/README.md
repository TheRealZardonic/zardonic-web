# 3D Models

## Required Files

Place the following GLB files in this directory:

- **ZARDONICHEAD.glb** - Used for the loading screen with animated 3D rotation
- **ZARDONICTEXT.glb** - Used as the main page logo with parallax 3D scrolling effect

## Usage

The loading screen component automatically loads ZARDONICHEAD.glb and displays it with rotation animation during app initialization.

The Logo3D component loads ZARDONICTEXT.glb and applies a parallax effect that responds to page scrolling:
- Rotates on Y-axis as you scroll
- Moves vertically and in depth based on scroll position
- Subtle X-axis rotation creates a dynamic 3D effect

## Fallback

If either GLB file is not present, a fallback 3D placeholder will be displayed instead with the same animations.
