// Decide how this device can run the models:
//   live (webgpu)  fast, on the graphics card
//   live (wasm)    on the CPU, slower but works almost everywhere
//   archive        real outputs recorded in advance, for phones and slow links

export type PlayMode = 'webgpu' | 'wasm' | 'archive';

export interface Capability {
  webgpu: boolean;
  memoryGB: number | null;
  mobile: boolean;
  saveData: boolean;
  recommended: PlayMode;
  reason: string;
}

interface NavigatorExtras {
  gpu?: { requestAdapter(): Promise<unknown | null> };
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
  userAgentData?: { mobile?: boolean };
}

export async function detectCapability(): Promise<Capability> {
  const nav = navigator as Navigator & NavigatorExtras;
  let webgpu = false;
  try {
    webgpu = !!(await nav.gpu?.requestAdapter());
  } catch {
    webgpu = false;
  }
  const memoryGB = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const mobile = nav.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const saveData = !!nav.connection?.saveData || /(^|-)2g$/.test(nav.connection?.effectiveType ?? '');
  return { webgpu, memoryGB, mobile, saveData, ...recommend({ webgpu, memoryGB, mobile, saveData }) };
}

export function recommend(c: { webgpu: boolean; memoryGB: number | null; mobile: boolean; saveData: boolean }): {
  recommended: PlayMode;
  reason: string;
} {
  if (c.saveData) return { recommended: 'archive', reason: 'Your browser asked to save data, and each model is a 120 MB download.' };
  if (c.memoryGB !== null && c.memoryGB < 4) return { recommended: 'archive', reason: 'This device reports less than 4 GB of memory.' };
  if (c.mobile && !c.webgpu) return { recommended: 'archive', reason: 'Phones without WebGPU run these models very slowly.' };
  if (c.webgpu) return { recommended: 'webgpu', reason: 'Your graphics card can run the models directly.' };
  return { recommended: 'wasm', reason: 'The models will run on your CPU. It works, just more slowly.' };
}
