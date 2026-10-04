"use client";

import { MessageSquare, Pencil, Plus } from "lucide-react";
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
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import { LESSON_COMMENT_MAX_LENGTH } from "~/lib/utils/lesson-comment";
import { type Lesson } from "~/types/schedule";
import { api } from "~/trpc/react";

interface LessonCommentProps {
  lesson: Pick<Lesson, "id" | "teacherId" | "comment">;
  className?: string;
}

/**
 * Комментарий преподавателя к паре: его видят все,
 * менять может только подтверждённый преподаватель в своих парах.
 */
export default function LessonComment({
  lesson,
  className,
}: LessonCommentProps) {
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
  const { mutateAsync, isPending } = api.schedule.setComment.useMutation();

  if (!lesson.comment && !canEdit) return null;

  const save = async (comment: string | null) => {
    try {
      await mutateAsync({ lessonId: lesson.id, comment });
      await utils.schedule.get.invalidate();
      toast.success(comment ? "Комментарий сохранён" : "Комментарий удалён");
      setIsOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      {lesson.comment && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="whitespace-pre-wrap break-words">
            {lesson.comment}
          </span>
        </div>
      )}

      {canEdit && (
        <Button
          size="xs"
          variant="tenary"
          onClick={() => {
            setValue(lesson.comment ?? "");
            setIsOpen(true);
          }}
        >
          {lesson.comment ? (
            <>
              <Pencil className="h-4 w-4" />
              Изменить комментарий
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Комментарий
            </>
          )}
        </Button>
      )}

      {canEdit && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Комментарий к паре</DialogTitle>
              <DialogDescription>
                Комментарий увидят все, кто смотрит расписание этой пары.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              rows={4}
              maxLength={LESSON_COMMENT_MAX_LENGTH}
              placeholder="Например: принести ноутбук, тест в начале пары"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <div className="text-right text-xs text-muted-foreground">
              {value.length}/{LESSON_COMMENT_MAX_LENGTH}
            </div>
            <DialogFooter className="gap-2">
              {lesson.comment && (
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
