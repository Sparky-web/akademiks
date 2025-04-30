import { H3, H4 } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Card({ children, ...props }: Props) {
  return (
    <div
      {...props}
      className={cn(
        "bg-card grid content-start gap-4 rounded-2xl p-4 shadow-none",
        props.className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, ...props }: Props) {
  return (
    <H4 {...props} className={cn("font-semibold", props.className)}>
      {children}
    </H4>
  );
}
