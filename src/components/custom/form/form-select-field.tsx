

import { FieldApi } from "@tanstack/react-form"
import { LabelGroup } from "~/components/custom/label-group"
import { Input } from "~/components/ui/input"
import { cn } from "~/lib/utils"
import { ConfigurationItem } from "~/types"
import ChildrenInterface from "~/types/children-interface"
import { FormFieldInterface } from "./form-text-field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/"

type Option = {
    label: string
    value: string
}

export type Options = ({
    label: string
    values: Option[]
} | Option)[]

interface FormFieldSelectInterface extends FormFieldInterface {
    options: Options
}

export function FormSelectField(props: FormFieldSelectInterface) {
    return (
        <LabelGroup>
            {props.children || ''}
            <Select
                disabled={!props.options.length}
                value={props.field.state.value}
                onValueChange={(value) => props.field.handleChange(value)}
            >
                <SelectTrigger className="whitespace-break-spaces">
                    <SelectValue placeholder="Выберите" className=" "></SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {props.options.map(e => {
                            if ('values' in e) {
                                return (
                                    <SelectGroup key={e.label}>
                                        <SelectLabel>{e.label}</SelectLabel>
                                        {e.values.map(e => (
                                            <SelectItem value={e.value} key={e.value}>{e.label}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                )
                            }

                            return (
                                <SelectItem value={e.value} key={e.value}>{e.label}</SelectItem>
                            )
                        })}
                    </SelectGroup>
                </SelectContent>
            </Select >
            {
                Boolean(props.field.state.meta.errors.length) && <span className="text-red-500 text-xs">
                    {props.field.state.meta.errors.map(e => e.message).join(', ')}
                </span>
            }
        </LabelGroup >
    )
}