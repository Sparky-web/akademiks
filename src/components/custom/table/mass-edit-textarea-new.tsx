import { FormApi } from "@tanstack/react-form";
import { Check } from "lucide-react";
import React, { ChangeEvent, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Row } from "@tanstack/react-table";
import { TablePassedProps } from "./data-table-new";

interface MassEditTextareaProps extends TablePassedProps {
    header: any;
}

export default function MassEditTextarea(props: MassEditTextareaProps) {
    const {useTableContext} = props;

    const { table, options } = useTableContext()
    const { header } = props;
    const rowSelected = table.getSelectedRowModel().rows.length;

    const form = options.editable.form;

    const [value, setValue] = React.useState("")

    const applyChanges = (_value?: string) => {
        table.getSelectedRowModel().rows.forEach((row: Row<any>) => {
            const isEditable = options.editable.getRowCanEdit ? options.editable.getRowCanEdit(row) : true

            if (!isEditable) return

            row.getAllCells().forEach((cell) => {
                if (cell.column.columnDef.accessorKey === header.columnDef.accessorKey) {
                    form.setFieldValue(cell.id, _value)
                }
            })
        });
    }

    return (
        <div className="flex gap-2 mt-2">
            <Textarea
                value={value}
                onInput={(e) => {
                    e.currentTarget.style.height = "1px";
                    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                }}
                style={{
                    height: '38px',
                    minHeight: '38px',
                    overflow: 'hidden',
                    resize: "none",
                }}
                rows={1}
                className="max-w-full text-black font-normal focus-visible:ring-1  focus-visible:ring-offset-1"
                onChange={(e) => {
                    setValue(e.target.value)
                    if (rowSelected < 50) applyChanges(e.target.value)
                }}
                onBlur={() => {
                    if (rowSelected < 50) form.validateAllFields('change')
                }}
            />

            {rowSelected >= 50 && <Button className="h-[38px] min-w-[38px] w-[38px] p-0" variant="outline"
                onClick={() => {
                    applyChanges(value)
                    form.validateAllFields('change')
                }}
            ><Check className="h-4 w-4" /></Button>}
        </div>
    )
}