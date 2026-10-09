import type {} from '@mui/x-data-grid/themeAugmentation'
import { alpha, type Components, type Theme } from '@mui/material/styles'
import { fontFamily } from './tokens'

/**
 * Global MUI component overrides: the single place buttons, cards, chips, tabs, dialogs,
 * drawers, inputs, progress and data grids get their OPSFORGE look. Pages never restyle these.
 */
export function createComponents(theme: Theme): Components<Theme> {
  const { palette, opsforge, shadows } = theme
  const { radius, motion } = opsforge
  const transition = `${motion.duration.fast}ms ${motion.easing.standard}`

  return {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          colorScheme: palette.mode,
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility',
        },
        body: { backgroundColor: palette.background.default },
        'code, kbd, samp, pre': { fontFamily: fontFamily.mono },
        '::selection': { backgroundColor: alpha(palette.primary.main, 0.25) },
        '*:focus-visible': {
          outline: `2px solid ${palette.primary.main}`,
          outlineOffset: 2,
        },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          fontWeight: 700,
          padding: '6px 14px',
          transition: `background-color ${transition}, border-color ${transition}, color ${transition}`,
        },
        sizeSmall: { padding: '3px 10px', fontSize: '0.75rem' },
        sizeLarge: { padding: '10px 20px', fontSize: '0.875rem' },
        outlined: { borderColor: palette.border.strong },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: radius.md } } },

    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: palette.border.default },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          border: `1px solid ${palette.border.subtle}`,
          boxShadow: shadows[1],
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: theme.spacing(2.5),
          '&:last-child': { paddingBottom: theme.spacing(2.5) },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: radius.sm,
          height: 24,
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        sizeSmall: { height: 20, fontSize: '0.6875rem' },
        outlined: { borderColor: palette.border.default },
        filled: { backgroundColor: palette.background.sunken },
        label: { paddingInline: 8 },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontFamily: fontFamily.mono,
          fontWeight: 600,
          fontSize: '0.6875rem',
          minWidth: 18,
          height: 18,
          padding: '0 5px',
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 40, borderBottom: `1px solid ${palette.border.subtle}` },
        indicator: { height: 2, borderRadius: 2 },
      },
    },
    MuiTab: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          minHeight: 40,
          padding: '8px 14px',
          fontWeight: 700,
          color: palette.text.secondary,
          '&.Mui-selected': { color: palette.primary.main },
          '&:hover': { color: palette.text.primary },
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: radius.xl,
          border: `1px solid ${palette.border.default}`,
          boxShadow: shadows[16],
        },
      },
    },
    MuiDialogTitle: { styleOverrides: { root: { padding: theme.spacing(2.5, 3, 1) } } },
    MuiDialogContent: { styleOverrides: { root: { padding: theme.spacing(1, 3) } } },
    MuiDialogActions: {
      styleOverrides: { root: { padding: theme.spacing(2, 3, 2.5), gap: theme.spacing(1) } },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundImage: 'none', borderColor: palette.border.subtle },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: radius.pill,
          backgroundColor: alpha(palette.text.primary, palette.mode === 'light' ? 0.08 : 0.14),
        },
        bar: { borderRadius: radius.pill },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.mode === 'light' ? '#0F1722' : '#F1F5F9',
          color: palette.mode === 'light' ? '#F1F5F9' : '#0F1722',
          fontSize: '0.75rem',
          fontWeight: 600,
          borderRadius: radius.sm,
          padding: '6px 10px',
        },
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: radius.md,
          backgroundColor: palette.background.paper,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: palette.border.default },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: palette.border.strong },
        },
      },
    },

    MuiListItemButton: { styleOverrides: { root: { borderRadius: radius.md } } },
    MuiDivider: { styleOverrides: { root: { borderColor: palette.border.subtle } } },

    MuiDataGrid: {
      styleOverrides: {
        root: {
          borderRadius: radius.lg,
          borderColor: palette.border.subtle,
          backgroundColor: palette.background.paper,
          fontSize: '0.8125rem',
          '& .MuiDataGrid-columnHeaders': { backgroundColor: palette.background.sunken },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 700,
            fontSize: '0.75rem',
            color: palette.text.secondary,
          },
          '& .MuiDataGrid-cell, & .MuiDataGrid-columnHeader': {
            borderColor: palette.border.subtle,
          },
          '& .MuiDataGrid-row:hover': { backgroundColor: palette.action.hover },
          '& .MuiDataGrid-footerContainer': { borderColor: palette.border.subtle },
        },
      },
    },
  }
}
