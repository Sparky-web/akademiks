import { ChevronLeft, ChevronRight } from "lucide-react";
import DateTime from "~/lib/utils/datetime";
import { useState } from "react";
import { Day } from "~/types/schedule";
import DayLoadProgress from "./day-load-progress";

interface DayPickerProps {
  weekStart: Date;
  selectedDayStart: Date;
  days: Day[];
  onSelectDay: (date: Date) => void;
  onChange: (date: Date) => void;
}

const daysOfWeek = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export default function DayPicker(props: DayPickerProps) {
  const { selectedDayStart, onSelectDay, weekStart, onChange } = props;

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        onClick={() =>
          onChange(DateTime.fromJSDate(weekStart).minus({ week: 1 }).toJSDate())
        }
        className="text-gray-500 hover:text-gray-700"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <div className="flex w-full max-w-[600px] justify-between gap-2">
        {daysOfWeek.map((day, index) => {
          const date = DateTime.fromJSDate(weekStart)
            .plus({ days: index })
            .toJSDate();
          const isSelected =
            date.toISOString() === selectedDayStart.toISOString();
          const foundDay = props.days.find(
            (e) => e.start.toISOString() === date.toISOString(),
          );

          return (
            <button
              key={day}
              className={`flex w-full flex-col items-center rounded-lg p-1 transition-colors ${isSelected ? "bg-primary text-white" : "text-muted-foreground dark:hover:bg-accent/50 hover:bg-gray-100"}`}
              onClick={() => onSelectDay(date)}
            >
              <span className="text-xs">{day}</span>
              <span className="mb-2 text-base font-semibold">
                {date.getDate() + 1}
              </span>
              <DayLoadProgress day={foundDay} />
            </button>
          );
        })}
      </div>
      <button
        onClick={() =>
          onChange(DateTime.fromJSDate(weekStart).plus({ week: 1 }).toJSDate())
        }
        className="text-gray-500 hover:text-gray-700"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
