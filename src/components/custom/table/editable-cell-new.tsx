import { CellContext } from "@tanstack/react-table";
import React, { useEffect, useRef } from "react";
import { ExtendedColumnDef } from "./types/new";
import { FormApi } from "@tanstack/react-form";
import { cn } from "~/lib/utils";
// import { EditableCellProps } from "./editable-cell";
import { TablePassedProps } from "./data-table-new";

interface EditableCellProps extends CellContext<any, unknown>, TablePassedProps {

}

const EditableCell = (props: EditableCellProps) => {
  const { cell, column, useTableContext} = props;
//   const editProps = (props.column.columnDef as ExtendedColumnDef<any>)

  const {options} = useTableContext()
  const form = options?.editable?.form;

  if(!form) return <div className="text-muted-foreground">
    Не передан объект формы для редактирования
  </div>

  const validator = (column.columnDef as ExtendedColumnDef<any>).options?.editProps?.validator

//   if (!editProps) return cell.getValue();


  return (
    <>
      <form.Field name={cell.id} preserveValue={true}
        validators={{
          onChange: validator,
        }}
      >
        {(field) => {
          const ref = useRef(null);

          useEffect(() => {
            if (ref.current) {
              if (!field.state.value) {
                // @ts-ignore
                ref.current.style.height = "36px"
                return
              }
              // @ts-ignore
              ref.current.style.height = "1px";
              // @ts-ignore
              ref.current.style.height = `${ref.current.scrollHeight}px`;
            }
          }, [ref, field.state.value])

          return (
            <div className="mr-[2px] ">
              <textarea
                aria-multiselectable={true}
                ref={ref}
                name={cell.id}
                value={field.state.value === null ? "" : field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                }}
                onBlur={field.handleBlur}
                className={cn("bg-transparent pt-0 mt-4 px-4 outline-none w-full max-h-[128px]",
                   options.size === 'sm' && 'text-xs px-1 mt-2',
                )}
                rows={1}
                style={{
                  resize: "none",
                }}
              />
              <div className={
                cn("pb-4 text-xs px-4 text-red-600",
                  options.size === 'sm' && 'text-xs px-0 pb-0',
                )
              }>
                {field.state.meta?.errorMap?.onChange ? (
                  <p>{field.state.meta?.errorMap?.onChange}</p>
                ) : null}
              </div>
            </div>

          );
        }}
      </form.Field>
    </>
  );
};

export default EditableCell;
