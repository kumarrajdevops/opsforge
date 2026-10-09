import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import Button, { type ButtonProps } from '@mui/material/Button'
import type { ModuleKey } from '@opsforge/types'
import { Link } from 'react-router-dom'
import { modulePath } from '../presentation'

interface ModuleButtonProps extends Omit<ButtonProps<typeof Link>, 'component' | 'to'> {
  module: ModuleKey
}

/** Button that navigates to a module; the single place Command Center actions become links. */
export function ModuleButton({ module, children, ...props }: ModuleButtonProps) {
  return (
    <Button
      component={Link}
      to={modulePath(module)}
      endIcon={<ArrowForwardIcon fontSize="small" />}
      {...props}
    >
      {children}
    </Button>
  )
}
