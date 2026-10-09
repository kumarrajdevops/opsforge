import type { SxProps, Theme } from '@mui/material/styles'

/** Merge caller-provided `sx` after a component's own styles without losing either. */
export function mergeSx(...parts: Array<SxProps<Theme> | undefined | false>): SxProps<Theme> {
  return parts.flatMap((part) =>
    part ? (Array.isArray(part) ? part : [part]) : [],
  ) as SxProps<Theme>
}

export const visuallyHidden = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
} as const
