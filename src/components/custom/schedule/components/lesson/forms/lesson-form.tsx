'use client'
import { useForm } from "@tanstack/react-form"
import { Combobox } from "~/components/custom/combobox"
import { Label, LabelGroup } from "~/components/custom/label-group"
import { api } from "~/trpc/react"
import { Lesson } from "~/types/schedule"
import _ from "lodash"

interface LessonFormProps {
    lesson?: Lesson & {
        type: 'student' | 'teacher'
    }
}


export default function CreateLessonForm({ lesson }: LessonFormProps) {
    const defaultValues = lesson ? {
        id: lesson.id,
        title: lesson.title,
        index: lesson.index,
        start: lesson.start,
        end: lesson.end,
        classroom: lesson.Classroom?.name,
        teacher: lesson.Teacher?.name,
        group: lesson.Group?.title,
        subgroup: lesson.subgroup,
        date: lesson.startDay
    } : {
        id: null,
        title: '',
        index: 0,
        start: new Date(),
        end: new Date(),
        classroom: '',
        teacher: '',
        group: '',
        subgroup: null,
        date: new Date()
    }

    const { data: lessonTitles } = api.handbooks.getUniqueLessonTitles.useQuery(
        lesson ?
            lesson?.type === 'teacher' ? { teacherId: lesson?.Teacher?.id } : { groupId: lesson?.Group?.id }
            :
            {}
    )

    const form = useForm({
        defaultValues
    })

    return (
        <div className="grid gap-4">
            <form onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
            }}>
                <LabelGroup>
                    <Label className="text-xs">предмет</Label>
                    <Combobox
                        size="sm"
                        data={lessonTitles || []} value={null}
                        modal={true}
                        onChange={function (value: string | null): void {
                            // throw new Error("Function not implemented.")
                        }}>

                    </Combobox>
                </LabelGroup>


                <LabelGroup>
                    <Label className="text-xs">преподаватель</Label>
                    {/* <Combobox
                        size="sm"
                        data={uniqueLessonTitles || []} value={null}
                        modal={true}
                        onChange={function (value: string | null): void {
                            // throw new Error("Function not implemented.")
                        }}>

                    </Combobox> */}
                </LabelGroup>
            </form>
        </div>
    )
}