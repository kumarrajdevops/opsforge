import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { fontFamily } from '../theme/tokens'
import { visuallyHidden } from '../utils/sx'

export interface CodeBlockProps {
  code: string
  /** Shown in the header, e.g. "bash", "yaml", "hcl". */
  language?: string
  title?: string
  /** Command prompt rendered before each line (not selectable, not copied), e.g. "$". */
  prompt?: string
  copyable?: boolean
  maxHeight?: number | string
  /** Wrap long lines instead of scrolling horizontally. */
  wrap?: boolean
}

/** Technical code / command block. Monospace, keyboard-scrollable, copy with live feedback. */
export function CodeBlock({
  code,
  language,
  title,
  prompt,
  copyable = true,
  maxHeight = 360,
  wrap = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const heading = title ?? language
  const lines = code.replace(/\n$/, '').split('\n')

  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.palette.border.default}`,
        borderRadius: `${theme.opsforge.radius.lg}px`,
        backgroundColor: theme.palette.background.sunken,
        overflow: 'hidden',
      })}
    >
      {(heading || copyable) && (
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.5,
            minHeight: 36,
            borderBottom: `1px solid ${theme.palette.border.subtle}`,
          })}
        >
          <Typography variant="overline" color="text.secondary">
            {heading}
          </Typography>
          {copyable && (
            <Tooltip title={copied ? 'Copied' : 'Copy'}>
              <IconButton size="small" onClick={copy} aria-label="Copy code to clipboard">
                {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
      <Box
        component="pre"
        tabIndex={0}
        aria-label={heading ? `${heading} code` : 'Code'}
        sx={{
          m: 0,
          p: 1.5,
          maxHeight,
          overflow: 'auto',
          fontFamily: fontFamily.mono,
          fontSize: '0.8125rem',
          lineHeight: 1.7,
          whiteSpace: wrap ? 'pre-wrap' : 'pre',
          wordBreak: wrap ? 'break-word' : 'normal',
        }}
      >
        <code>
          {lines.map((line, index) => (
            <Box
              key={index}
              component="span"
              data-prompt={prompt}
              sx={(theme) => ({
                display: 'block',
                ...(prompt && {
                  '&::before': {
                    content: 'attr(data-prompt) " "',
                    userSelect: 'none',
                    color: theme.palette.text.disabled,
                  },
                }),
              })}
            >
              {line || ' '}
            </Box>
          ))}
        </code>
      </Box>
      <Box role="status" sx={visuallyHidden}>
        {copied ? 'Copied to clipboard' : ''}
      </Box>
    </Box>
  )
}

/** Inline monospace token for commands, flags, identifiers and paths inside prose. */
export function InlineCode({ children }: { children: ReactNode }) {
  return (
    <Box
      component="code"
      sx={(theme) => ({
        fontFamily: fontFamily.mono,
        fontSize: '0.85em',
        px: 0.5,
        py: 0.125,
        borderRadius: `${theme.opsforge.radius.sm}px`,
        backgroundColor: theme.palette.background.sunken,
        border: `1px solid ${theme.palette.border.subtle}`,
      })}
    >
      {children}
    </Box>
  )
}
