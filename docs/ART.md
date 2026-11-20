# Art direction and shot list (Milestone 5)

Every scene is a **first-person view from a seated position at a desk**, with the
screen or terminal centered in the lower half. The game draws all readable text
itself (the paper, the screens, the whiteboard), so the images ask for **no
readable text and no logos**. Image text from generators comes out garbled, and
logos would imply endorsement. **No real people.**

Format: wide 3:2 landscape, about 1536×1024 or larger, exported to WebP at about 2560px wide.

## Era looks

| Era | Look |
|---|---|
| 1966 | Warm Kodachrome. Amber window light through Venetian blinds, tobacco haze, walnut and steel, Mad Men mid-century palette, fine film grain |
| 2018 | Bright, clean daylight. Exposed brick, white desks, Edison bulbs, a fogged bay window, a phone-camera-era look |
| 2019 | Same 2018 office **after dark**. Rain on the glass, blue night light, Valentine's pink accents, purple glow from a server rack |

## Shots

1. **`l1-office`**: 1966 Project MAC office, seated at the IBM 2741 terminal. Also the title-screen hero.
2. **`l2-office`**: 2018 San Francisco startup, seated at a standing desk with a big monitor.
3. **`l3-office`**: the same 2018 office at night on Feb 14, 2019.
4. **`dorothy`**: a 1960s secretary seen through or at a frosted-glass office door. Soft focus, from behind or in silhouette, never a recognizable face of a real person.

## Prompt: l1-office

> Photorealistic first-person view from an office chair at a steel desk in 1966, in a computer research lab office at MIT in Cambridge, Massachusetts. Centered in the lower half: an IBM 2741 typewriter terminal, a blue-grey electric typewriter built into a desk-height cabinet, with continuous fanfold paper feeding up and out of it. Mad Men era office: warm walnut wood-paneled walls, late-afternoon amber light streaming through Venetian blinds on a window at the left and casting striped shadows, a glass ashtray with a smoldering cigarette and a thin curl of smoke, a white coffee cup with a lipstick mark, a black rotary telephone on the right, a stack of fanfold computer printout at the left of the desk, a cork board and a framed diploma on the wall, a wooden door with a frosted glass window at the far right. Shallow depth of field, 35mm film photograph, Kodachrome colors, subtle film grain. No people. No readable text, no logos, no brand names. Wide 3:2 landscape.

## Prompt: l2-office

> Photorealistic first-person view from a chair at a white standing desk in a San Francisco AI research startup office in June 2018. Centered in the lower half: a large widescreen computer monitor showing a blank white code-notebook page (no readable text), a second smaller monitor angled at the left. Exposed red brick walls, a big industrial window at the left with fog over the city, a whiteboard on the back wall with abstract hand-drawn boxes and arrows (no readable words), Edison bulb pendant lights, a can of pastel-patterned sparkling water and a fidget spinner on the desk, a grey hoodie draped over a chair at the right, a houseplant. Bright natural daylight, clean modern look, slight phone-camera feel. No people. No readable text, no logos, no brand names. Wide 3:2 landscape.

## Prompt: l3-office

> The same San Francisco startup office as the previous image, now late at night on Valentine's Day 2019: dark, lit mostly by the monitor and a purple-pink glow from a server rack at the right. Rain streaking the big window at the left, city lights blurred outside. Pink and red heart-shaped balloons drifting near the ceiling, a heart-shaped box of chocolates and a red binder on the desk. Centered in the lower half: the same large monitor glowing with a blank pink-and-purple web page (no readable text). Moody, cinematic, photorealistic. No people. No readable text, no logos. Wide 3:2 landscape.

## Prompt: dorothy

> Photorealistic 1966 office scene: a woman in an early-1960s secretary's outfit (pencil skirt, cardigan, neat bouffant hairstyle) seen from behind and slightly to the side as she stands in a wooden office doorway with a frosted glass window, soft late-afternoon light, out of focus, Kodachrome colors, film grain. Her face is not visible. No readable text. 3:2 landscape.

## Results (2026-11-20)

- **Image tool test**, same prompt (`l1-office`) in three tools: **ChatGPT** won on mood and first-person framing. **Gemini** was close and higher-resolution (2528px), but put the terminal smaller in frame. **Meta AI** produced an impossible floating paper stack. ChatGPT made all four shots; the night office and Dorothy were edits of the day office and the empty 1966 office, so they line up almost pixel for pixel.
- Shipped as WebP (1536×1024, 120–165 KB each) in `public/art/`. Full-size originals are in the OneDrive project folder (`art-source/`).
- Hotspots are measured per image in `src/levels/scenes.ts` (percent boxes). The 2018 whiteboard handwriting ("117M!!" → "1.5B / DO NOT SHARE") is drawn by the game over the photo.
