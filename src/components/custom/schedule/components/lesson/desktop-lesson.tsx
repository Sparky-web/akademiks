import { Group, UsersIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatTime } from "~/app/lk/add-schedule/_lib/componetns/summary";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import Users from "~/server/api/routers/users";
import { type Lesson } from "~/types/schedule"
import ActionButtons from "./action-buttons";
import { cn } from "~/lib/utils";
import { useAppSelector } from "~/app/_lib/client-store";
import CreateLessonForm from "./forms/lesson-form";

type LessonProps = {
    lesson: Lesson & {
        type: 'student' | 'teacher'
    }
}

export default function DesktopLesson(props: LessonProps) {
    const { lesson } = props
    const [isEditing, setIsEditing] = useState(false)


    const isAdmin = useAppSelector(state => state.user.user?.isAdmin)



    return (
        <div className="flex-1 min-w-[175px] grid gap-1 relative" >
            {/* {isHovered && <div className="absolute top-[-4px] right-[0px]">
            </div>} */}
            <TooltipProvider>
                <Tooltip>
                    <div className="flex justify-between items-top gap-2">
                        {lesson.type === 'student' &&
                            <div className="font-medium text-sm line-clamp-3 overflow-hidden">
                                {lesson.title}
                            </div>
                        }

                        {lesson.type === 'teacher' && <div className="flex gap-2 items-center font-medium">
                            <UsersIcon className="w-4 h-4" />
                            {lesson.Group?.title}
                        </div>}

                        {isAdmin &&
                            <ActionButtons lesson={lesson} 
                                onSave={() => setIsEditing(false)}
                                isEditing={isEditing}
                                setIsEditing={setIsEditing}
                            />
                        }
                    </div>

                    {lesson.type === 'teacher' &&
                        <TooltipTrigger asChild>
                            <div className="text-xs line-clamp-2 overflow-hidden">
                                {lesson.title}
                            </div>
                        </TooltipTrigger>
                    }
                    <TooltipContent className="max-w-[300px] text-xs">
                        {lesson.title}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {isEditing && <CreateLessonForm lesson={lesson} />}
            
            {!isEditing && <>
                <div className="text-xs text-muted-foreground">
                    {formatTime(lesson.start)} - {formatTime(lesson.end)}
                </div>
                <div className="text-xs text-muted-foreground">
                    {lesson.Classroom.name}
                    {lesson.type === 'student' && ", " + lesson.Teacher?.name}
                </div>
                {lesson.subgroup && <div className="text-xs font-medium">Подгруппа {lesson.subgroup}</div>}
            </>}
        </div>

    )
}