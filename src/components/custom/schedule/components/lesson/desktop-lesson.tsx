import { Group, UsersIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "~/app/lk/add-schedule/_lib/componetns/summary";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { type Lesson } from "~/types/schedule"
import ActionButtons from "./action-buttons";
import { cn } from "~/lib/utils";
import { useAppSelector } from "~/app/_lib/client-store";
import CreateLessonForm from "./forms/lesson-form";
import { FormApi, ReactFormApi } from "@tanstack/react-form";
import { classroom } from "googleapis/build/src/apis/classroom";
import { isLessonsEqual } from "../../utils/is-lessons-equal";

type LessonProps = {
    type: 'student' | 'teacher'
    form: ReactFormApi<any, any>,
    initialLesson?: Lesson,
    lessonFormKey: string
}

export default function DesktopLesson(props: LessonProps) {
    const { form, type, lessonFormKey, initialLesson } = props

    const isAdmin = useAppSelector(state => state.user.user?.isAdmin)

    return (
        <form.Field name={props.lessonFormKey}>
            {(field) => (
                <div className={cn("grid gap-1 relative p-3 content-start min-w-[225px] h-full w-full",
                    !field.state.value?.id && 'bg-green-500/5',
                    initialLesson && !isLessonsEqual(field.state.value, initialLesson) && 'bg-amber-500/5',
                    field.state.value?.isDeleted && 'bg-red-500/5 line-through',
                )
                } >
                    <TooltipProvider>
                        <Tooltip>
                            <div className="flex justify-between items-top gap-2">
                                {type === 'student' &&
                                    <div className="font-medium text-sm line-clamp-3 overflow-hidden ">
                                        {field.state.value.title}
                                    </div>
                                }

                                {type === 'teacher' && <div className="flex gap-2 items-center font-medium">
                                    <UsersIcon className="w-4 h-4" />
                                    {field.state.value.Group?.title}
                                </div>}

                                {isAdmin && !field.state.value.isDeleted &&
                                    <ActionButtons
                                        field={field}
                                        form={form}
                                        lessonFormKey={props.lessonFormKey}
                                    />
                                }
                            </div>

                            {type === 'teacher' &&
                                <TooltipTrigger asChild>
                                    <div className="text-xs line-clamp-2 overflow-hidden">
                                        {field.state.value.title}
                                    </div>
                                </TooltipTrigger>
                            }
                            <TooltipContent className="max-w-[300px] text-xs">
                                {field.state.value.title}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {field.state.value.isEditing && <CreateLessonForm
                        form={form}
                        type={type}
                        field={field}
                        lessonFormKey={props.lessonFormKey}
                    />}

                    {!field.state.value.isEditing && <>
                        <div className="text-xs text-muted-foreground">
                            {formatTime(field.state.value.start)} - {formatTime(field.state.value.end)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {field.state.value.Classroom?.name || 'Не указано'}
                            {type === 'student' && ", " + (field.state.value.Teacher?.name || 'Не указано')}
                        </div>
                        {field.state.value.subgroup && <div className="text-xs font-medium">Подгруппа {field.state.value.subgroup}</div>}
                    </>}
                </div>
            )}
        </form.Field>

    )
}


