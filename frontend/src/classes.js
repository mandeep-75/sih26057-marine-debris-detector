export const SSS_CLASSES = ['cylinder', 'manta', 'airplane', 'shipwreck', 'victim']

export const CLASSES = [
  'can',
  'bottle',
  'drink-carton',
  'chain',
  'propeller',
  'tire',
  'hook',
  'valve',
  'shampoo-bottle',
  'standing-bottle',
]

export const FLS_CLASSES = CLASSES

/** Per-scan-type class lists (order matches the ONNX class-output columns). */
export const CLASSES_BY_TYPE = {
  sidescan: SSS_CLASSES,
  forward: FLS_CLASSES,
}

export const classesFor = (scanType) => CLASSES_BY_TYPE[scanType] || CLASSES

export const CLASS_COLORS = {
  ...(CLASSES_BY_TYPE.sidescan
    ? {
        cylinder: '#9C6F4F',
        manta: '#5E7A9E',
        airplane: '#8FA3B8',
        shipwreck: '#8C6D8F',
        victim: '#B0504C',
      }
    : {}),
  can: '#813E31',
  bottle: '#5984C0',
  'drink-carton': '#D3CA9C',
  chain: '#7D894D',
  propeller: '#389494',
  tire: '#383E57',
  hook: '#C88541',
  valve: '#77C5B2',
  'shampoo-bottle': '#D590A1',
  'standing-bottle': '#4B9849',
}

export const CLASS_IDS = Object.fromEntries(CLASSES.map((c, i) => [c, i]))

const WHITE_CHIP_TEXT = new Set(['can', 'tire', 'cylinder', 'manta', 'shipwreck', 'victim'])

export function chipTextColor(cls) {
  return WHITE_CHIP_TEXT.has(cls) ? '#ffffff' : '#0f172a'
}

export const CLASS_DOT_CLASS = {
  cylinder: 'bg-class-cylinder',
  manta: 'bg-class-manta',
  airplane: 'bg-class-airplane',
  shipwreck: 'bg-class-shipwreck',
  victim: 'bg-class-victim',
  can: 'bg-class-can',
  bottle: 'bg-class-bottle',
  'drink-carton': 'bg-class-drink-carton',
  chain: 'bg-class-chain',
  propeller: 'bg-class-propeller',
  tire: 'bg-class-tire',
  hook: 'bg-class-hook',
  valve: 'bg-class-valve',
  'shampoo-bottle': 'bg-class-shampoo-bottle',
  'standing-bottle': 'bg-class-standing-bottle',
}

export const classDotClass = (cls) => CLASS_DOT_CLASS[cls] || 'bg-slate-400'