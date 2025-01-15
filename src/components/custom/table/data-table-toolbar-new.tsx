import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DataTableViewOptions } from "./data-table-view-options";
import { X } from "lucide-react";
import DataTableRowCount from "./data-table-row-count";
import DataTableActions from "./data-table-actions";
import { TablePassedProps } from "./data-table-new";
import { Checkbox } from "~/components/ui/checkbox";

interface DataTableToolbarProps extends TablePassedProps {
    setShowOnlySelected: (showOnlySelected: boolean) => any
    showOnlySelected: boolean
}

export default function DataTableToolbar({ useTableContext, showOnlySelected, setShowOnlySelected }: DataTableToolbarProps) {
    const { options, table } = useTableContext

    const filters = options?.filters?.enabled ? table.getAllColumns().map(column => ({
        columnKey: column.id,
        value: column?.getFilterValue?.() || '',
        title: column.columnDef.header,
    })).filter(e => e.value) : []

    const selected = table.getSelectedRowModel().rows.length

    return (
        <div className="grid ml-1 gap-4">
            {filters.length > 0 && <div className="flex items-center content-center gap-3 h-fit flex-wrap">
                <span className="">Фильтры: </span>
                {filters.map((filter) => {
                    const column = table.getColumn(filter.columnKey)
                    if (!column) return null

                    return <Button variant={'tenary'} size={'xs'}
                        key={filter.columnKey}
                        onClick={() => {
                            column.setFilterValue(undefined)
                        }}>
                        {column.columnDef.header}: {filter.value?.join(', ')}
                        <X className="h-4 w-4" />
                    </Button>
                })}
            </div>}


            <div className="flex items-center content-center justify-between">
                <div className="flex gap-4 content-center items-center">
                    {options?.header?.rowCount && <DataTableRowCount useTableContext={useTableContext} />}
                    {
                        options?.header?.search &&
                        <Input
                            placeholder="Поиск..."
                            value={table.getState().globalFilter}
                            onChange={(e) => table.setGlobalFilter(e.target.value)}
                            className="w-full lg:w-64 h-9"
                        />
                    }
                </div>
                <div className="flex items-center gap-2">
                    {options?.header?.columnManagement && <DataTableViewOptions table={table} useTableContext={useTableContext} />}
                    {/* {table.getSelectedRowModel().rows.length > 0 && massActions && <DataTableMassActions table={table} massActions={massActions} />} */}
                    {selected > 0 && <DataTableActions rows={table.getSelectedRowModel().rows} useTableContext={useTableContext} />}
                </div>
            </div>

            {options?.header?.showOnlySelected && <div className="flex gap-2 content-center items-center">
                <Checkbox
                    id='show_selected'
                    checked={showOnlySelected}
                    onCheckedChange={(checked) => {
                        setShowOnlySelected(checked)
                    }}
                />
                <label for="show_selected" className="text-sm font-medium">
                    Показать только выбранные
                </label>
            </div>}

        </div>
    )
}