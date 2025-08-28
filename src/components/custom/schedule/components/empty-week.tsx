import { Button } from "~/components/ui/button";
import { H2, H3, P } from "~/components/ui/typography";

interface EmptyWeekProps {
  onReturn?: () => void;
  isWeekNow?: boolean;
}
export default function EmptyWeek({ onReturn, isWeekNow }: EmptyWeekProps) {
  return (
    <div className="grid justify-center justify-items-center gap-3 text-center">
      <H3>На этой неделе занятия не найдены</H3>
      <P className="text-sm">
        Занятия отсутствуют или расписание еще не составлено
      </P>
      {onReturn && !isWeekNow && (
        <Button
          onClick={onReturn}
          className="mt-2 max-w-fit"
          variant={"tenary"}
        >
          к текущей неделе
        </Button>
      )}
    </div>
  );
}
