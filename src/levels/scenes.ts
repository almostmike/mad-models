// Photoreal scene layouts. Hotspot boxes are % of each 3:2 photo
// (measured on the images in public/art; see docs/ART.md).

import type { PhotoSceneConfig } from '../ui/photo-scene';

const art = (name: string) => `${import.meta.env.BASE_URL}art/${name}.webp`;

export const ART = {
  l1: art('l1-office'),
  l1Dorothy: art('l1-dorothy'),
  l2: art('l2-office'),
  l3: art('l3-office'),
};

export const L1_SCENE: PhotoSceneConfig = {
  image: ART.l1,
  alt: 'A 1966 office: an IBM typewriter terminal on a steel desk, wood paneling, late sun through Venetian blinds.',
  focus: [53, 56],
  hotspots: [
    { id: 'terminal', label: 'IBM 2741 terminal: sit down and type', box: [30.5, 42, 45, 38] },
    { id: 'printout', label: 'Printout on the desk', box: [0, 53, 21, 25] },
    { id: 'coffee', label: 'Coffee cup', box: [15, 63.5, 10.5, 12.5] },
    { id: 'ashtray', label: 'Ashtray', box: [75.8, 63.5, 9.6, 7.5] },
    { id: 'phone', label: 'Telephone', box: [84.6, 52, 15.4, 15.6] },
    { id: 'door', label: 'Office door', box: [85.8, 5, 14.2, 45] },
    { id: 'diploma', label: 'Framed diploma', box: [71.5, 13.5, 10, 14] },
    { id: 'corkboard', label: 'Cork board', box: [42, 9.5, 26, 25.5] },
    { id: 'window', label: 'Window', box: [0, 0, 21, 47] },
  ],
  effects: [{ kind: 'smoke', box: [79.5, 38, 6, 27] }, { kind: 'flicker', box: [0, 0, 100, 100] }],
};

export const L2_SCENE: PhotoSceneConfig = {
  image: ART.l2,
  alt: 'A 2018 San Francisco startup office: a big monitor on a white desk, brick walls, a whiteboard, fog over the city.',
  focus: [51, 55],
  hotspots: [
    { id: 'monitor', label: 'Your monitor: sit down and type', box: [25.8, 35.5, 50.8, 44.5] },
    { id: 'whiteboard', label: 'Whiteboard', box: [60.7, 18.5, 39.3, 29.5] },
    { id: 'window', label: 'Window', box: [0, 0, 35.8, 50] },
    { id: 'lacroix', label: 'Sparkling water can', box: [26.8, 71.6, 5, 14.6] },
    { id: 'spinner', label: 'Fidget spinner', box: [19.3, 87.5, 7.2, 6.5] },
    { id: 'hoodie', label: 'Hoodie on the chair', box: [77, 50, 17, 11] },
  ],
};

export const L3_SCENE: PhotoSceneConfig = {
  image: ART.l3,
  alt: 'The same office at night on Valentine’s Day 2019: rain on the window, heart balloons, a pink glowing monitor, a server rack.',
  focus: [51, 55],
  hotspots: [
    { id: 'monitor', label: 'The demo machine: sit down', box: [25.7, 35.4, 49.8, 44.6] },
    { id: 'binder', label: 'Notebook marked DO NOT RELEASE', box: [2.5, 80, 17, 14.5] },
    { id: 'rack', label: 'Server rack', box: [90.4, 21.9, 8.8, 21.3] },
    { id: 'window', label: 'Rainy window', box: [0, 0, 36, 50] },
    { id: 'balloons', label: 'Valentine’s balloons', box: [27, 0, 70, 18] },
    { id: 'chocolates', label: 'Box of chocolates', box: [69.6, 80, 20.8, 16.3] },
  ],
  effects: [
    { kind: 'rain', box: [0, 0, 22.5, 50.6] },
    { kind: 'glow', box: [85, 15, 15, 35] },
  ],
};

/** Where the 2018 whiteboard handwriting goes (the clear top-left corner of the board). */
export const L2_WHITEBOARD_NOTE: [number, number, number, number] = [61.4, 20, 8, 14];
