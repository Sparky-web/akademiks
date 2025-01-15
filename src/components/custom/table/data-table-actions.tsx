import { useContext, useMemo } from "react"
import { flexRender, Row } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "~/components/ui/dropdown-menu"
import { Button } from "~/components/ui/button"
import { TablePassedProps } from "./data-table-new"

interface DataTableActionsProps  extends TablePassedProps {
  rows: Row<any>[]
}


export default function DataTableActions({ rows, useTableContext }: DataTableActionsProps) {
    const { table, options } = useTableContext()
    const massActions = options?.actions?.actionsArray

    return (<DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[305px]">
            {massActions?.map((action, i) => <div key={action.id}>
                {flexRender(
                    typeof action.header === "string" ?
                        ({ table, selected }) => (<Button disabled={action.disabled ? action.disabled({ selected: rows || table.getSelectedRowModel().rows }) : false} key={action.id} variant="ghost" className="w-full h-full" onClick={() => action.action(rows ||table.getSelectedRowModel().rows)}>
                            {action.header}
                        </Button>)
                        : action.header,
                    { table, selected: rows || table.getSelectedRowModel().rows }
                )}
            </div>)
            }

        </DropdownMenuContent>
    </DropdownMenu>
    )
}