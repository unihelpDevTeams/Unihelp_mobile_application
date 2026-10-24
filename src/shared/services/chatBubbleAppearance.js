export const BUBBLE_PRESETS = [
  { key: 'brand', label: 'Classic', color: '#5B5CE2' },
  { key: 'ocean', label: 'Ocean', color: '#0A84FF' },
  { key: 'rose', label: 'Rose', color: '#E83E8C' },
  { key: 'forest', label: 'Forest', color: '#1F9D6A' },
  { key: 'cherry', label: 'Cherry', color: '#E53935' },
  { key: 'amber', label: 'Amber', color: '#E59600' },
  { key: 'mint', label: 'Mint', color: '#00A884' },
  { key: 'midnight', label: 'Midnight', color: '#27374D' },
  { key: 'sunset', label: 'Sunset', gradient: ['#FF7A18', '#AF002D'] },
  { key: 'violet', label: 'Violet', gradient: ['#7F00FF', '#E100FF'] },
  { key: 'aurora', label: 'Aurora', gradient: ['#00C6FF', '#0072FF'] },
  { key: 'candy', label: 'Candy', gradient: ['#F953C6', '#B91D73'] },
  { key: 'lime', label: 'Lime', gradient: ['#56AB2F', '#A8E063'] },
  { key: 'ember', label: 'Ember', gradient: ['#F12711', '#F5AF19'] },
];

export const CHAT_BACKGROUNDS = [
  { key: 'default', label: 'Default', color: null },
  { key: 'midnight-grid', label: 'Midnight grid', gradient: ['#E8E7FF', '#C8C6FF'], darkGradient: ['#12152B', '#25215A'], pattern: 'grid' },
  { key: 'aurora', label: 'Aurora', gradient: ['#D9F5FF', '#DED9FF', '#F9D6ED'], darkGradient: ['#082F49', '#312E81', '#5B2167'], pattern: 'orb' },
  { key: 'paper', label: 'Soft paper', gradient: ['#F8FAFC', '#E9EFFF'], darkGradient: ['#1E293B', '#273449'], pattern: 'dots' },
  { key: 'campus', label: 'Campus dusk', gradient: ['#FFF1EB', '#ACE0F9'], darkGradient: ['#4A2C3B', '#244A66'], pattern: 'sun' },
  { key: 'forest', label: 'Forest mist', gradient: ['#DDF7EA', '#BFE9D5'], darkGradient: ['#0F3D32', '#1C6E5A'], pattern: 'leaf' },
  { key: 'rose', label: 'Rose haze', gradient: ['#FFE4E6', '#E9D5FF'], darkGradient: ['#492442', '#34264F'], pattern: 'orb' },
  { key: 'mono', label: 'Monochrome', gradient: ['#F5F5F5', '#D4D4D8'], darkGradient: ['#19191D', '#36363E'], pattern: 'grid' },
  { key: 'stardust', label: 'Stardust', gradient: ['#312E81', '#7C3AED', '#DB2777'], darkGradient: ['#11113A', '#3B1C72', '#7A214F'], pattern: 'stars' },
  { key: 'deep-sea', label: 'Deep sea', gradient: ['#06B6D4', '#1D4ED8', '#312E81'], darkGradient: ['#083344', '#172554', '#1E1B4B'], pattern: 'bubbles' },
  { key: 'citrus-pop', label: 'Citrus pop', gradient: ['#D9F99D', '#FDE047', '#FB923C'], darkGradient: ['#365314', '#854D0E', '#9A3412'], pattern: 'confetti' },
  { key: 'glitch', label: 'Glitch grid', gradient: ['#0F172A', '#164E63', '#312E81'], darkGradient: ['#020617', '#082F49', '#1E1B4B'], pattern: 'glitch' },
  { key: 'cotton-candy', label: 'Cotton candy', gradient: ['#FBCFE8', '#C4B5FD', '#BAE6FD'], darkGradient: ['#831843', '#4C1D95', '#0C4A6E'], pattern: 'stripes' },
  { key: 'volcano', label: 'Volcano', gradient: ['#451A03', '#B91C1C', '#F97316'], darkGradient: ['#1C0A0A', '#7F1D1D', '#9A3412'], pattern: 'embers' },
  { key: 'glacier', label: 'Glacier', gradient: ['#CFFAFE', '#A5F3FC', '#BFDBFE'], darkGradient: ['#164E63', '#155E75', '#1E3A8A'], pattern: 'grid' },
  { key: 'dreamscape', label: 'Dreamscape', gradient: ['#F5D0FE', '#DDD6FE', '#C7D2FE'], darkGradient: ['#701A75', '#4C1D95', '#1E3A8A'], pattern: 'orbs' },
];

export const BUBBLE_SHAPES = [
  { key: 'tail', label: 'Speech tail', radii: { borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 22, borderBottomRightRadius: 5 } },
  { key: 'ticket', label: 'Ticket', radii: { borderTopLeftRadius: 8, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 8 } },
  { key: 'comet', label: 'Comet', radii: { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 4 } },
  { key: 'pixel', label: 'Pixel', radii: { borderTopLeftRadius: 2, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 2 } },
  { key: 'ribbon', label: 'Ribbon', radii: { borderTopLeftRadius: 26, borderTopRightRadius: 5, borderBottomLeftRadius: 5, borderBottomRightRadius: 26 } },
  { key: 'orbit', label: 'Orbit', radii: { borderTopLeftRadius: 36, borderTopRightRadius: 12, borderBottomLeftRadius: 36, borderBottomRightRadius: 12 } },
  { key: 'fold', label: 'Fold', radii: { borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 } },
  { key: 'capsule', label: 'Capsule', radii: { borderTopLeftRadius: 999, borderTopRightRadius: 999, borderBottomLeftRadius: 999, borderBottomRightRadius: 999 } },
  { key: 'pebble', label: 'Pebble', radii: { borderTopLeftRadius: 34, borderTopRightRadius: 34, borderBottomLeftRadius: 34, borderBottomRightRadius: 14 } },
  { key: 'leaf', label: 'Leaf', radii: { borderTopLeftRadius: 32, borderTopRightRadius: 8, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 } },
  { key: 'postcard', label: 'Postcard', radii: { borderTopLeftRadius: 4, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 4 } },
  { key: 'droplet', label: 'Droplet', radii: { borderTopLeftRadius: 30, borderTopRightRadius: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 2 } },
  { key: 'arch', label: 'Arch', radii: { borderTopLeftRadius: 32, borderTopRightRadius: 32, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 } },
  { key: 'soft-square', label: 'Soft square', radii: { borderTopLeftRadius: 12, borderTopRightRadius: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 } },
  { key: 'cut-corner', label: 'Cut corner', radii: { borderTopLeftRadius: 2, borderTopRightRadius: 24, borderBottomLeftRadius: 2, borderBottomRightRadius: 24 } },
  { key: 'zigzag', label: 'Zigzag', radii: { borderTopLeftRadius: 9, borderTopRightRadius: 9, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 }, accents: 'zigzag' },
  { key: 'alien', label: 'Alien blob', radii: { borderTopLeftRadius: 36, borderTopRightRadius: 8, borderBottomLeftRadius: 12, borderBottomRightRadius: 34 } },
  { key: 'shard', label: 'Crystal shard', radii: { borderTopLeftRadius: 3, borderTopRightRadius: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 3 } },
  { key: 'bubblegum', label: 'Bubblegum', radii: { borderTopLeftRadius: 28, borderTopRightRadius: 38, borderBottomLeftRadius: 18, borderBottomRightRadius: 32 } },
  { key: 'glitch', label: 'Glitch', radii: { borderTopLeftRadius: 2, borderTopRightRadius: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 2 }, accents: 'glitch' },
  { key: 'meteor', label: 'Meteor', radii: { borderTopLeftRadius: 30, borderTopRightRadius: 5, borderBottomLeftRadius: 5, borderBottomRightRadius: 30 } },
];

export const DEFAULT_BUBBLE_APPEARANCE = {
  preset: 'brand',
  shape: 'tail',
  animation: 'none',
  customColor: '#5B5CE2',
  fontSize: 15.5,
  density: 'comfortable',
  width: 'standard',
  metadata: 'inline',
  wallpaper: 'default',
};

export const isHexColor = (value) => /^#[0-9A-F]{6}$/i.test(String(value || '').trim());

export const normalizeBubbleAppearance = (value = {}) => {
  const candidate = { ...DEFAULT_BUBBLE_APPEARANCE, ...(value || {}) };
  return {
    ...candidate,
    preset: [...BUBBLE_PRESETS.map((item) => item.key), 'custom'].includes(candidate.preset) ? candidate.preset : 'brand',
    shape: BUBBLE_SHAPES.some((item) => item.key === candidate.shape) ? candidate.shape : 'tail',
    animation: ['none', 'aurora-border', 'shimmer', 'float', 'pop'].includes(candidate.animation) ? candidate.animation : 'none',
    customColor: isHexColor(candidate.customColor) ? candidate.customColor.toUpperCase() : DEFAULT_BUBBLE_APPEARANCE.customColor,
    fontSize: [14, 15.5, 17].includes(Number(candidate.fontSize)) ? Number(candidate.fontSize) : DEFAULT_BUBBLE_APPEARANCE.fontSize,
    density: ['compact', 'comfortable'].includes(candidate.density) ? candidate.density : 'comfortable',
    width: ['compact', 'standard', 'wide'].includes(candidate.width) ? candidate.width : 'standard',
    metadata: candidate.metadata === 'below' ? 'below' : 'inline',
    wallpaper: CHAT_BACKGROUNDS.some((item) => item.key === candidate.wallpaper) ? candidate.wallpaper : 'default',
  };
};

export const resolveBubbleFill = (appearance = {}) => {
  if (appearance.preset === 'custom') {
    return { color: isHexColor(appearance.customColor) ? appearance.customColor : DEFAULT_BUBBLE_APPEARANCE.customColor };
  }
  return BUBBLE_PRESETS.find((item) => item.key === appearance.preset) || BUBBLE_PRESETS[0];
};

export const resolveChatBackground = (appearance = {}) =>
  CHAT_BACKGROUNDS.find((item) => item.key === appearance.wallpaper) || CHAT_BACKGROUNDS[0];

const hexLuminance = (hex) => {
  const clean = String(hex || '').replace('#', '');
  if (clean.length !== 6) return 0;
  const [r, g, b] = [0, 2, 4]
    .map((index) => parseInt(clean.slice(index, index + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const resolveBubbleInk = (fill) => {
  const palette = fill?.gradient || (fill?.color ? [fill.color] : []);
  if (!palette.length) return null;
  const average = palette.reduce((sum, hex) => sum + hexLuminance(hex), 0) / palette.length;
  return average > 0.45 ? { text: '#14141F', meta: 'rgba(20,20,31,0.6)' } : null;
};
