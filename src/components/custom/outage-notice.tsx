import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { env } from "~/env";

// Временное объявление после аварии в дата-центре (октябрь 2026): аккаунты УРТК удалены.
export default function OutageNotice() {
  if (env.NEXT_PUBLIC_UNIVERSITY === "RGSU") return null;

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
