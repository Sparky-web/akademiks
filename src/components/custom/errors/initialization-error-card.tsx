// import Card from "../card";

import { AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { H4, P } from "~/components/ui/typography";

export default function InitializationErrorCard({
  message,
  onReset,
}: {
  message: string;
  onReset?: () => void;
}) {
  return (
    <div className="grid content-center justify-center justify-items-center gap-3 text-center">
      <H4 className="flex justify-center gap-2 text-lg">
        <AlertCircle className="mt-1 h-5 w-5" />
        Что-то пошло не так
      </H4>
      <P className="text-base">
        Если ошибка повторяется, пожалуйста, сообщите об этом в Telegram -{" "}
        <a
          className="text-primary underline"
          target="_blank"
          href={"https://t.me/vladislavbabinov"}
        >
          @vladislavbabinov
        </a>
      </P>
      <P className="text-muted-foreground text-base">{message}</P>
      {onReset && (
        <Button
          variant="tenary"
          onClick={onReset}
          className="mt-2 max-w-[300px]"
        >
          Перезагрузить
        </Button>
      )}
    </div>
  );
}
