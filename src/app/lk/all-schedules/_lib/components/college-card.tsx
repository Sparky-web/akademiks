import { Landmark } from "lucide-react";
import Card from "~/components/custom/card";
import { H3, H4 } from "~/components/ui/typography";
import { env } from "~/env";

export default function CollegeCard() {
  const universityName =
    env.NEXT_PUBLIC_UNIVERSITY === "RGSU"
      ? "Российский государственный социальный университет"
      : "Уральский радиотехнический колледж им. А.С. Попова";

  return (
    <div className="grid gap-3">
      <div className="flex content-center gap-2">
        <Landmark className="min-h-5 min-w-5" />
        <H3>{universityName}</H3>
      </div>
      <div className="text-muted-foreground">Все расписания</div>
    </div>
  );
}
