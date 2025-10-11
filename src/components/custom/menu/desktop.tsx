import { usePathname } from "next/navigation";
import { MenuItem } from ".";
import Link from "next/link";
import { cn } from "~/lib/utils";
import { H2 } from "~/components/ui/typography";
import Logo from "~/images/logo.svg";
import Image from "next/image";
import { env } from "~/env";

interface MenuProps {
  data: MenuItem[];
}

export default function DesktopMenu({ data }: MenuProps) {
  const pathname = usePathname();
  const universityName =
    env.NEXT_PUBLIC_UNIVERSITY === "RGSU" ? "РГСУ" : "УРТК";

  return (
    <div className="relative z-10 hidden content-start gap-6 bg-card px-5 pt-8 shadow-xl lg:grid">
      <H2 className="flex content-start items-start gap-2">
        <Image
          src={Logo}
          alt="Академикс"
          width={24}
          height={24}
          style={{
            transform: "translateY(8px)",
          }}
        />
        Академикс x {universityName}
      </H2>
      <div className="grid gap-2">
        {data.map((item) => {
          const isActive = pathname.includes(item.path);
          return (
            <Link
              key={item.title}
              href={item.path}
              className={cn(
                "flex min-h-12 content-center items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted",
                isActive && "bg-primary/10 text-primary hover:bg-primary/15",
              )}
            >
              <item.icon className="h-5 w-5" />
              <div
                className={cn(
                  "text-sm font-medium",
                  isActive && "text-primary",
                )}
              >
                {item.title}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
