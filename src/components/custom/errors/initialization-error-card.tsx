// import Card from "../card";

import { AlertCircle } from "lucide-react";
import { H4, P } from "~/components/ui/typography";

export default function InitializationErrorCard({
  message,
}: {
  message: string;
}) {
  return (
    <div className="grid gap-2 rounded-lg bg-red-100 p-4">
      <H4 className="flex gap-2 text-base">
        <AlertCircle className="mt-1 h-5 w-5" />
        Что-то пошло не так
      </H4>
      <P className="text-sm">{message}</P>
    </div>
  );
}
