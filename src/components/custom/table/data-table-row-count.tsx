import { TablePassedProps } from "./data-table-new"

export default function DataTableRowCount({useTableContext}: TablePassedProps) {
    const { options, table } = useTableContext

    return (
        <div className="text-sm text-muted-foreground ">
            {
                options?.selectable?.enabled ?
                    <>{table.getFilteredSelectedRowModel().rows.length} из {table.getFilteredRowModel().rows.length} строк выбрано ({ `всего выбрано ${table.getSelectedRowModel().rows.length}`})</>
                    : "строк найдено: " + table.getFilteredRowModel().rows.length
            }
        </div>
    )
}