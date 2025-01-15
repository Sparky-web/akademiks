"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { useRef } from "react"


type ComboboxItem = {
  value: string,
  label: string
} | {
  label: string
  values: ComboboxItem[]
}

interface ComboboxProps {
  data: ComboboxItem[],
  size?: 'sm' | 'base'
  value: string | null,
  className?: string
  modal?: boolean
  onChange: (value: string | null) => void
}

export function Combobox({ data, value, onChange, modal = false, size = 'base', className }: ComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const ref = useRef()

  const itemsToFind = data.flatMap(e => 'values' in e ? e.values : [e])

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between text-base h-12 font-normal px-3 max-w-full", size === 'sm' && 'text-xs h-7 px-2', className)}
          ref={ref}
        >
          <div className="line-clamp-1 break-words max-w-full">
            {value
              ? itemsToFind.find((item) => item.value === value)?.label
              : "Выберите..."}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" style={{
        width: ref.current?.clientWidth,
        minWidth: '300px'
      }}>
        <Command>
          <CommandInput placeholder="Поиск..." className={cn("text-sm", size === 'sm' && 'text-sm')} />
          <CommandList className="max-md:max-h-[200px]">
            <CommandEmpty>Ничего не найдено</CommandEmpty>
            {data.map((item) => {
              if ('values' in item) {
                return (
                  <CommandGroup key={item.label} heading={item.label}>
                    {item.values.map((_item) => (
                      <CommandItem
                        className={cn("text-base font-medium", size === 'sm' && 'text-xs')}
                        key={_item.value}
                        value={_item.label}
                        onSelect={(currentValue) => {
                          const _value = itemsToFind.find((_item) =>currentValue === _item.value)?.value

                          if (!_value) return

                          onChange(value === _value ? null : _value)
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 min-w-4",
                            value === _item.value ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {_item.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              }

              return (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  className={cn("text-base font-medium", size === 'sm' && 'text-xs')}
                  onSelect={(currentValue) => {
                    const _value = itemsToFind.find((_item) => item.label === _item.label)?.value
                    if (!_value) return

                    onChange(value === _value ? null : _value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 min-w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label}
                </CommandItem>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}


