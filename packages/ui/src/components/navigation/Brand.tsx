import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

/** OPSFORGE mark + wordmark. Flat, single accent: a prompt chevron on a rounded tile. */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
      <Box
        component="svg"
        viewBox="0 0 32 32"
        width={32}
        height={32}
        aria-hidden
        focusable="false"
        sx={(theme) => ({ color: theme.palette.primary.main, flexShrink: 0 })}
      >
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path
          d="M10 11l6 5-6 5"
          fill="none"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M18.5 22h5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </Box>
      {!compact && (
        <Typography
          component="span"
          sx={{ fontWeight: 800, fontSize: '1.0625rem', letterSpacing: '0.04em' }}
        >
          OPSFORGE
        </Typography>
      )}
    </Box>
  )
}
