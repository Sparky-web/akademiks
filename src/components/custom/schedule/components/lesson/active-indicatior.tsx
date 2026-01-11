import DateTime from "~/lib/utils/datetime";
import formatNounWithNumber from "~/lib/utils/format-noun-with-number";

export interface ActiveIndicatiorProps {
  start: Date;
  end: Date;
}

export function formatDiff(targetDateTime) {
  const now = DateTime.now();
  const diff = targetDateTime.diff(now);

  // Получение значений для различных единиц
  const minutes = diff.as("minutes");
  const hours = diff.as("hours");
  const days = diff.as("days");

  // Форматирование вывода в зависимости от разницы
  if (minutes < 0) {
    return "в прошлом";
  } else if (minutes < 60) {
    return `через ${Math.round(minutes)} ${formatNounWithNumber(Math.round(minutes), ["минута", "минуты", "минут"])}`;
  } else if (hours < 24) {
    return `через ${Math.round(hours)} ${formatNounWithNumber(Math.round(hours), ["час", "часа", "часов"])} ${Math.round(minutes % 60)} ${formatNounWithNumber(Math.round(minutes % 60), ["минута", "минуты", "минут"])}`;
  } else {
    return `через ${Math.round(days)} ${formatNounWithNumber(Math.round(days), ["день", "дня", "дней"])}`;
  }
}

export default function ActiveIndicatior({
  start,
  end,
}: ActiveIndicatiorProps) {
  let type: "start" | "end" = "start";
  if (DateTime.fromJSDate(start) < DateTime.now()) type = "end";

  return (
    <div className="mx-[-20px] flex items-center gap-4 rounded-b-xl bg-primary px-5 py-2 text-sm font-medium text-white">
      {type === "start" && (
        <>начинается {formatDiff(DateTime.fromJSDate(start))}</>
      )}

      {type === "end" && (
        <>заканчивается {formatDiff(DateTime.fromJSDate(end))}</>
      )}

      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/50 opacity-75"></span>
        <span className="relative inline-flex h-3 w-3 rounded-full bg-white/70"></span>
      </span>
      {/* Pulsating indicator with circle inside */}
      {/* <div className="relative "></div> */}
    </div>
  );
}
