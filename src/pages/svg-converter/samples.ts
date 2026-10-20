export interface SvgSample {
  id: string;
  name: string;
  fileName: string;
  svg: string;
}

export const samples: SvgSample[] = [
  {
    id: "sparkle",
    name: "Sparkle",
    fileName: "sparkle.svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.5c.2 5 2.5 7.3 7.5 7.5-5 .2-7.3 2.5-7.5 7.5-.2-5-2.5-7.3-7.5-7.5 5-.2 7.3-2.5 7.5-7.5Z" fill="currentColor"/><path d="M19 15.5c.1 2.2 1.2 3.3 3.4 3.4-2.2.1-3.3 1.2-3.4 3.4-.1-2.2-1.2-3.3-3.4-3.4 2.2-.1 3.3-1.2 3.4-3.4Z" fill="currentColor"/></svg>`,
  },
  {
    id: "bolt",
    name: "Bolt",
    fileName: "bolt.svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13.2 2 5 13.4h5.3L9.8 22 19 10.6h-5.3L13.2 2Z" fill="currentColor"/></svg>`,
  },
  {
    id: "orbit",
    name: "Orbit",
    fileName: "orbit.svg",
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3.2" fill="currentColor"/><ellipse cx="12" cy="12" rx="9.5" ry="4.2" stroke="currentColor" stroke-width="1.6"/><ellipse cx="12" cy="12" rx="4.2" ry="9.5" stroke="currentColor" stroke-width="1.6"/></svg>`,
  },
];
