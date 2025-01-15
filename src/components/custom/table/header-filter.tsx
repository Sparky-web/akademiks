import { Column, Table } from "@tanstack/react-table";
import { Check, CheckIcon, FilterIcon, SortAsc } from "lucide-react";
import { useMemo } from "react";
import { Button } from "~/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "~/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { type Row } from "@tanstack/react-table";


export default function HeaderFilters(props: { name: string, column: Column<any, unknown>, data: { name: string, value: string | number, count: number }[] }) {
  const { name, column, data } = props;

  const selectedValues = new Set(column?.getFilterValue() as (string | number)[])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          // disabled={!items}
          // ref={ref}
          variant="ghost"
          role="combobox"
          // aria-expanded={open}
          className="-ml-3 gap-3 h-8 "
        >
          {name}
          <FilterIcon className="h-4 w-4 " />
          {/* <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /> */}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className=" p-0 w-[275px] "
      // style={{ width: ref.current?.offsetWidth }}
      >
        <Command>
          <CommandInput placeholder="Поиск" className="h-9" />
          <CommandEmpty>Не найдено</CommandEmpty>
          <ScrollArea className="h-[400px] overflow-auto">
            <CommandGroup>
              {data.map(item => {
                const isSelected = selectedValues.has(item.value)
                return (
                  <CommandItem key={item.value}
                    className="content-center items-center flex justify-between gap-3"
                    onSelect={() => {
                      if (isSelected) {
                        selectedValues.delete(item.value)
                      } else {
                        selectedValues.add(item.value)
                      }
                      const filterValues = Array.from(selectedValues)
                      column?.setFilterValue(
                        filterValues.length ? filterValues : undefined
                      )
                    }}
                  >
                    <div className="flex items-center content-center">
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <CheckIcon className={cn("h-4 w-4")} />
                      </div>
                      {/* {option.icon && (
                                            <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        )} */}
                      <div className="grid gap-1">
                        <span>{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.value}</span>
                      </div>
                    </div>

                    <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs mr-2">
                      {item.count}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

type CreateHeaderFiltersProps<T> = {
  column: Column<T, unknown>,
  nameSelector: (row: T) => string,
  valueSelector: (row: T) => string | number,
}

export const createHeaderFilters = (props: CreateHeaderFiltersProps<any>) => {
  const { column, nameSelector, valueSelector } = props;

  let a = column.getFacetedRowModel().rows.values();
  const rows: any[] = Array.from(a).map(e => e.original);

  let result = {};
  for (const row of rows) {
    const value = valueSelector(row);

    if (result[value] !== undefined) {
      result[value].count += 1;
    }
    else {
      result[value] = {
        name: nameSelector(row),
        value: value,
        count: 1
      }
    }
  }

  // column.parent?.parent.

  const resultArr = Object.entries(result).map(([value, { count, name }], index) => ({
    name,
    value,
    count
  }));

  return (
    <HeaderFilters name={column.columnDef.headerText} column={column} data={resultArr} />
  )
}


export const createFilterFn = (valueSelector: (row: any) => string) => {
  return (row: Row<any>, columnId: string, filterValue: string) => {
    return filterValue.includes(valueSelector(row.original));
  }
}