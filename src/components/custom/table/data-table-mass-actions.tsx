"use client";

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { Table } from "@tanstack/react-table";
import { MoreHorizontal, ToggleRight } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
} from "~/components/ui/dropdown-menu";
import { MassAction } from "./data-table";

import {flexRender} from "@tanstack/react-table"

interface DataTableViewOptionsProps<TData> {
    table: Table<TData>;
    massActions?: MassAction<TData>[];
}

export function DataTableMassActions<TData>({
    table,
    massActions
}: DataTableViewOptionsProps<TData>) {
    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[305px]">
                {massActions?.map((action, i) => 
                flexRender(
                    typeof action.header === "string" ? 
                    ({table, selected}) => (<Button disabled={action.disabled ? action.disabled({selected: table.getSelectedRowModel().rows}) : false} key={action.id} variant="ghost" className="w-full h-full" onClick={() => action.action(table.getSelectedRowModel().rows, table)}>
                        {action.header}
                    </Button>)
                    : action.header,
                    {table, selected: table.getSelectedRowModel().rows}
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}