import { usePathname } from "next/navigation";
import { MenuItem } from ".";
import Link from "next/link";
import { cn } from "~/lib/utils";

interface MenuProps {
    data: MenuItem[]
}

export default function MobileMenu({ data }: MenuProps) {
    const pathname = usePathname()

    return (
        <div className="fixed z-10 lg:hidden  bottom-[0px] left-0 w-full py-3 bg-card shadow-2xl grid grid-cols-[1fr_1fr_1fr] gap-3 rounded-t-xl mobile-menu"
            style={{
                paddingBottom: 'calc(max(env(safe-area-inset-bottom, 12px), 12px) + 12px)'
            }}
        >
            {data.map(item => {
                const isActive = pathname.includes(item.path)
                return (
                    <Link key={item.title} href={item.path} className="grid gap-1 justify-center justify-items-center">
                        <div className={
                            cn(
                                "w-10 h-10 py-2 rounded-xl bg-muted grid justify-center",
                                isActive && 'bg-primary text-primary-foreground dark:text-white'
                            )}>
                            <item.icon className="w-6 h-6 " />
                        </div>
                        <div className={cn(
                            "text-xs font-medium text-center text-muted-foreground",
                            isActive && 'text-primary'
                        )}>{item.title}</div>
                    </Link>
                )
            })}
        </div>
    )
}