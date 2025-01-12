import { cn } from "~/lib/utils";
import ChildrenInterface from "~/types/children-interface";

interface LabelGroupProps extends ChildrenInterface, React.HTMLAttributes<HTMLDivElement> { }

export function LabelGroup(props: LabelGroupProps) {
    return (
        <div
            {...props}
            className={cn("grid gap-1 content-start", ...props?.className || '')}
        >
            {props.children || ''}
        </div>
    )
}

export function Label(props: LabelGroupProps) {
    return (
        <span {...props} className={
            cn("text-muted-foreground text-sm", ...props?.className || '')
        } >
            {props.children || ''}
        </span>
    )
}
