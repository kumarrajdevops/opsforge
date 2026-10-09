import {
  DataGrid,
  type DataGridProps,
  type GridColDef,
  type GridValidRowModel,
} from '@mui/x-data-grid'
import { fontFamily } from '../theme/tokens'
import { mergeSx } from '../utils/sx'

export type DataTableColumn<R extends GridValidRowModel = GridValidRowModel> = GridColDef<R>

export interface DataTableProps<R extends GridValidRowModel> extends Omit<
  DataGridProps<R>,
  'aria-label'
> {
  /** Required accessible name for the table. */
  label: string
  pageSize?: number
}

/**
 * Standard data table. Compact density, click-to-select off, paginated, auto height.
 * Add `cellClassName: 'mono'` on a column for identifiers, metrics and commands.
 */
export function DataTable<R extends GridValidRowModel>({
  label,
  pageSize = 10,
  sx,
  ...props
}: DataTableProps<R>) {
  return (
    <DataGrid<R>
      density="compact"
      disableRowSelectionOnClick
      pageSizeOptions={[10, 25, 50]}
      initialState={{ pagination: { paginationModel: { pageSize } } }}
      {...props}
      aria-label={label}
      sx={mergeSx({ '& .mono': { fontFamily: fontFamily.mono, fontSize: '0.8125rem' } }, sx)}
    />
  )
}
