"use client";

import { Pencil, Plus, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAppSelector } from "~/app/_lib/client-store";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import { type Lesson } from "~/types/schedule";
import { api } from "~/trpc/react";

interface MeetingLinkProps {
  lesson: Pick<Lesson, "id" | "teacherId" | "meetingUrl">;
  className?: string;
}

/**
 * Ссылка на видеовстречу: студенты видят кнопку «Подключиться»,
 * подтверждённый преподаватель дополнительно может менять ссылку в своих парах.
 */
export default function MeetingLink({ lesson, className }: MeetingLinkProps) {
  const user = useAppSelector((e) => e.user?.user);

  const canEdit =
    !!user &&
    user.role === 2 &&
    user.isTeacherVerified &&
    !!user.teacherId &&
    user.teacherId === lesson.teacherId;

  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");

  const utils = api.useUtils();
  const { mutateAsync, isPending } = api.schedule.setMeetingUrl.useMutation();

  if (!lesson.meetingUrl && !canEdit) return null;

  const save = async (url: string | null) => {
    try {
      await mutateAsync({ lessonId: lesson.id, url });
      await utils.schedule.get.invalidate();
      toast.success(url ? "Ссылка сохранена" : "Ссылка удалена");
      setIsOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {lesson.meetingUrl && (
        <Button asChild size="xs" variant="tenary">
          <a href={lesson.meetingUrl} target="_blank" rel="noopener noreferrer">
            <Video className="h-4 w-4" />
            Подключиться
          </a>
        </Button>
      )}

      {canEdit && (
        <Button
          size="xs"
          variant="tenary"
          onClick={() => {
            setValue(lesson.meetingUrl ?? "");
            setIsOpen(true);
          }}
        >
          {lesson.meetingUrl ? (
            <Pencil className="h-4 w-4" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Ссылка на видеовстречу
            </>
          )}
        </Button>
      )}

      {canEdit && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ссылка на видеовстречу</DialogTitle>
              <DialogDescription>
                Ссылка появится в расписании студентов. Если у вас несколько
                групп в это же время, она добавится ко всем.
              </DialogDescription>
            </DialogHeader>
            <Input
              type="url"
              inputMode="url"
              placeholder="https://telemost.yandex.ru/j/…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <DialogFooter className="gap-2">
              {lesson.meetingUrl && (
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => save(null)}
                >
                  Удалить
                </Button>
              )}
              <Button
                disabled={isPending || !value.trim()}
                onClick={() => save(value)}
              >
                Сохранить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
