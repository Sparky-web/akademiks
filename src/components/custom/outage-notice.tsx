"use client";

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { env } from "~/env";
import { useAppSelector } from "~/app/_lib/client-store";

// Объявление висит две недели после восстановления, потом пропадает само, без релиза.
const OUTAGE_NOTICE_UNTIL = new Date("2026-10-23T00:00:00+05:00");

// Временное объявление после аварии в дата-центре (октябрь 2026): аккаунты УРТК удалены.
// Вошедшим не показываем: они уже зарегистрировались заново после аварии.
export default function OutageNotice() {
  const user = useAppSelector((e) => e.user?.user);

  if (user) return null;
  if (env.NEXT_PUBLIC_UNIVERSITY === "RGSU") return null;
  if (Date.now() >= OUTAGE_NOTICE_UNTIL.getTime()) return null;

  return (
    <Alert className="border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 [&>svg]:text-amber-600">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Была авария в дата-центре</AlertTitle>
      <AlertDescription>
        Из-за аварии аккаунты пользователей были удалены. Зарегистрируйтесь
        заново и выберите свою группу или преподавателя.
      </AlertDescription>
    </Alert>
  );
}
