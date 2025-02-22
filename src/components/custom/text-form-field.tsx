'use client'

import { FieldApi } from "@tanstack/react-form"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"

const TextFormField = ({ field, label, inputProps }: { field: FieldApi<any, any>, label: string, inputProps: React.InputHTMLAttributes<HTMLInputElement> }) => {
    return <div className="grid gap-1.5">
        <Label>{label}</Label>
        <Input onChange={e => field.handleChange(e.target.value)}
            value={field.state.value}
            {...inputProps}
        />
        {!!field.state.meta.errors.length && <p className="text-red-500 text-xs font-medium">{field.state.meta.errors.map(e => e.message).join(', ')}</p>}
    </div>
}


export default TextFormField