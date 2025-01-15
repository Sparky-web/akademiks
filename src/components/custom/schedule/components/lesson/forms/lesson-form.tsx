'use client'
import { useField, useForm } from "@tanstack/react-form"
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
        group: lesson.Group?.id,
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

    const form = useForm({
        defaultValues
    })

    const lessonTitle = form.useField({
        name: 'title',
    })

    const { data: lessonTitles } = api.handbooks.getUniqueLessonTitles.useQuery(
        lesson ?
            lesson?.type === 'teacher' ? { teacherId: lesson?.Teacher?.id } : { groupId: lesson?.Group?.id }
            :
            {}
    )

    const { data: teachers } = api.handbooks.getTeachers.useQuery({
        lessonTitle: lessonTitle.state.value
    })

    const { data: classrooms } = api.handbooks.getClassrooms.useQuery()

    const { data: groups } = api.groups.get.useQuery()

    // const { data: teachers } = api.teachers.get


    return (
        <div className="">
            <form
                className="grid gap-1"
                onSubmit={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                }}>
                <form.Field name="title">
                    {(field) => (
                        <LabelGroup className="grid gap-1">
                            <Label className="text-xs">предмет</Label>
                            <Combobox
                                size="sm"
                                data={lessonTitles || []} value={field.state.value}
                                className="max-w-[250px]"
                                modal={true}
                                onChange={(value) => field.handleChange(value || '')}>
                            </Combobox>
                        </LabelGroup>)}
                </form.Field>


                <form.Field name="teacher">
                    {(field) => (
                        <LabelGroup>
                            <Label className="text-xs">преподаватель</Label>
                            <Combobox
                                size="sm"
                                data={teachers || []} value={field.state.value}
                                modal={true}
                                className="max-w-[250px]"
                                onChange={(value) => {
                                    console.log(value)
                                    field.handleChange(value || '')
                                }
                                }>
                            </Combobox>
                        </LabelGroup>)}
                </form.Field>


                <form.Field name="classroom">
                    {(field) => (
                        <LabelGroup>
                            <Label className="text-xs">аудитория</Label>
                            <Combobox
                                size="sm"
                                data={classrooms || []} value={field.state.value}
                                modal={true}
                                className="max-w-[250px]"
                                onChange={(value) => field.handleChange(value || '')}>
                            </Combobox>
                        </LabelGroup>)}
                </form.Field>

                <form.Field name="group">
                    {(field) => (
                        <LabelGroup>
                            <Label className="text-xs">группа</Label>
                            <Combobox
                                size="sm"
                                data={groups?.map(e => ({
                                    label: e.title,
                                    value: e.id
                                })) || []}
                                modal={true}
                                className="max-w-[250px]"
                                onChange={(value) => field.handleChange(value || '')}>
                            </Combobox>
                        </LabelGroup>)}
                </form.Field>
            </form>
        </div>
    )
}