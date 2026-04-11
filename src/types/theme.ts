export const FONT_OPTIONS = [
  { value: 'gill-sans', label: 'Gill Sans', css: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },
  { value: 'inter', label: 'Inter', css: 'Inter, system-ui, sans-serif' },
  { value: 'noto-sans-tc', label: 'Noto Sans TC', css: '"Noto Sans TC", "Microsoft JhengHei", sans-serif' },
  { value: 'georgia', label: 'Georgia', css: 'Georgia, "Times New Roman", serif' },
] as const

export const COLOR_THEMES = [
  {
    value: 'default',
    label: 'Default',
    accent: '#2563eb',
    accentBg: '#eff6ff',
    heading: '#111827',
    text: '#374151',
    muted: '#6b7280',
    border: '#d1d5db',
  },
  {
    value: 'navy',
    label: 'Navy',
    accent: '#1e3a5f',
    accentBg: '#e8eef5',
    heading: '#0f172a',
    text: '#334155',
    muted: '#64748b',
    border: '#cbd5e1',
  },
  {
    value: 'warm',
    label: 'Warm',
    accent: '#92400e',
    accentBg: '#fef3c7',
    heading: '#1c1917',
    text: '#44403c',
    muted: '#78716c',
    border: '#d6d3d1',
  },
  {
    value: 'emerald',
    label: 'Emerald',
    accent: '#065f46',
    accentBg: '#ecfdf5',
    heading: '#111827',
    text: '#374151',
    muted: '#6b7280',
    border: '#d1d5db',
  },
] as const

export type FontValue = (typeof FONT_OPTIONS)[number]['value']
export type ColorValue = (typeof COLOR_THEMES)[number]['value']
