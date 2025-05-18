import { ChevronLeft } from "lucide-react";
import DateTime from "~/lib/utils/datetime";
import Link from "next/link";
import Schedule from "~/components/custom/schedule";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/server";
import AddToFavourite from "./_lib/componetns/add-to-favourite";
import { Metadata, ResolvingMetadata } from "next";

interface SchedulePageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata(
  { params, searchParams }: SchedulePageProps,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { id, type } = await params;

  const title = await api.schedule.getTitle({
    type: type as "student" | "teacher" | "classroom",
    id,
  });

  return {
    title: title + " | Академикс",
  };
}

export default async function SchedulePage(props: SchedulePageProps) {
  const params = await props.params;
  const weekStart = (await props.searchParams).weekStart;
  // if (params.type === "teacher") {
  //   void (await api.schedule.get.prefetch({
  //     groupId: params.id,
  //     weekStart:
  //       typeof weekStart === "string"
  //         ? new Date(weekStart)
  //         : DateTime.now().startOf("week").toJSDate(),
  //   }));
  // } else if (params.type === "student") {
  //   void (await api.schedule.get.prefetch({
  //     groupId: params.id,
  //     weekStart:
  //       typeof weekStart === "string"
  //         ? new Date(weekStart)
  //         : DateTime.now().startOf("week").toJSDate(),
  //   }));
  // } else if (params.type === "classroom") {
  //   void (await api.schedule.get.prefetch({
  //     classroomId: +params.id,
  //     weekStart:
  //       typeof weekStart === "string"
  //         ? new Date(weekStart)
  //         : DateTime.now().startOf("week").toJSDate(),
  //   }));
  // } else {
  //   throw new Error("Неверный тип расписания");
  // }

  if (
    params.type !== "student" &&
    params.type !== "teacher" &&
    params.type !== "classroom"
  ) {
    throw new Error("Неверный тип расписания");
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/lk/all-schedules`}>
          <Button variant="ghost" className="p-0 font-medium">
            <ChevronLeft className="h-5 w-5" />
            вернуться
          </Button>
        </Link>
        <AddToFavourite
          type={params.type}
          groupId={params.id}
          teacherId={params.id}
          classroomId={+params.id}
        />
      </div>
      <Schedule
        groupId={params.id}
        type={params.type}
        teacherId={params.id}
        classroomId={+params.id}
        weekStart={weekStart}
      />
    </div>
  );
}
