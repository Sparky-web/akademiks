'use client'
import { FieldApi, FormApi, ReactFormApi, useField, useForm } from "@tanstack/react-form"
import { Combobox } from "~/components/custom/combobox"
import { Label, LabelGroup } from "~/components/custom/label-group"
import { api } from "~/trpc/react"
import { Lesson } from "~/types/schedule"
import _ from "lodash"

interface LessonFormProps {
    // lesson: Lesson & {
    //     type: 'student' | 'teacher'
    // },
    type: 'student' | 'teacher'
    form: ReactFormApi<any, any> & FormApi<any, any>
    lessonFormKey: string,
    field: FieldApi<any, any>
}

const subgroups = [
    {
        label: 'Подгруппа 1',
        value: 1
    }, {
        label: 'Подгруппа 2',
        value: 2
    }, {
        label: 'Подгруппа 3',
        value: 3
    }, {
        label: 'Подгруппа 4',
        value: 4
    }]

export default function CreateLessonForm({ type, form, field, lessonFormKey }: LessonFormProps) {
    // const defaultValues = lesson ? {
    //     id: lesson.id,
    //     title: lesson.title,
    //     index: lesson.index,
    //     start: lesson.start,
    //     end: lesson.end,
    //     classroom: lesson.Classroom?.name,
    //     teacher: lesson.Teacher?.name,
    //     group: lesson.Group?.id,
    //     subgroup: lesson.subgroup || 'no',
    //     date: lesson.startDay
    // } : {
    //     id: null,
    //     title: '',
    //     index: 0,
    //     start: new Date(),
    //     end: new Date(),
    //     classroom: '',
    //     teacher: '',
    //     group: '',
    //     subgroup: 'no',
    //     date: new Date()
    // }

    // const form = useForm({
    //     defaultValues
    // })



    // const lessonTitle = form.useField({
    //     name: lessonFormKey + '.title',
    // })

    const lessonTitle = field.state.value.title

    const { data: lessonTitles } = api.handbooks.getUniqueLessonTitles.useQuery(
        type === 'teacher' ? { teacherId: field.state.value.Teacher?.id } : { groupId: field.state.value.Group?.id }
    )

    const { data: teachers } = api.handbooks.getTeachers.useQuery({
        lessonTitle: lessonTitle
    })

    const { data: classrooms } = api.handbooks.getClassrooms.useQuery()

    const { data: groups } = api.groups.get.useQuery()

    const teachersFlattened = teachers?.flatMap(e => 'values' in e ? e.values : [e])
    const classroomsFlattened = classrooms?.flatMap(e => 'values' in e ? e.values : [e])
    const groupsFlattened = groups?.flatMap(e => 'values' in e ? e.values : [e])

    return (
        <form
            className="grid gap-1 content-start w-[200px] pb-10"
            onSubmit={(e) => {
                e.preventDefault()
                // form.handleSubmit()
            }}>
            <form.Field name={lessonFormKey + '.title'}>
                {(field) => (
                    <LabelGroup className="grid gap-1">
                        <Label className="text-xs">предмет</Label>
                        <Combobox
                            size="sm"
                            data={lessonTitles || []} value={field.state.value}
                            className="max-w-[188px]"
                            modal={true}
                            onChange={(value) => {
                                console.log(value)
                                field.handleChange(value || '')
                            }}>
                        </Combobox>
                    </LabelGroup>)}
            </form.Field>


            {type === 'student' && <form.Field name={`${lessonFormKey}.teacherId`}>
                {(field) => {
                    console.log(field.state.value)
                    return (
                        <LabelGroup>
                            <Label className="text-xs">преподаватель</Label>
                            <Combobox
                                size="sm"
                                data={teachers || []} value={field.state.value}
                                modal={true}
                                className="max-w-[188px]"
                                onChange={(value) => {
                                    field.handleChange(value || '')
                                    form.setFieldValue(`${lessonFormKey}.Teacher`, {
                                        id: value,
                                        name: teachersFlattened?.find(e => e.value === value)?.label
                                    })
                                }
                                }>
                            </Combobox>
                        </LabelGroup>)
                }}
            </form.Field>}
            <form.Field name={`${lessonFormKey}.classroomId`}>
                {(field) => (
                    <LabelGroup>
                        <Label className="text-xs">аудитория</Label>
                        <Combobox
                            size="sm"
                            data={classrooms || []} value={field.state.value}
                            modal={true}
                            className="max-w-[188px]"
                            onChange={(value) => {
                                field.handleChange(value || '')
                                form.setFieldValue(`${lessonFormKey}.Classroom`, {
                                    id: value,
                                    name: classroomsFlattened?.find(e => e.value === value)?.label
                                })
                            }}>
                        </Combobox>
                    </LabelGroup>)}
            </form.Field>
            {<form.Field name={`${lessonFormKey}.groupId`}>
                {(field) => type === 'teacher' && (
                    <LabelGroup>
                        <Label className="text-xs">группа</Label>
                        <Combobox
                            size="sm"
                            data={groups?.map(e => ({
                                label: e.title,
                                value: e.id
                            })) || []}
                            modal={true}
                            className="max-w-[188px]"
                            value={field.state.value}
                            onChange={(value) => {
                                field.handleChange(value || '')
                                form.setFieldValue(`${lessonFormKey}.Group`, {
                                    id: value,
                                    title: groups?.find(e => e.id === value)?.title
                                })
                            }}>
                        </Combobox>
                    </LabelGroup>)}
            </form.Field>}
            <form.Field name={`${lessonFormKey}.subgroup`}>
                {(field) => (
                    <LabelGroup>
                        <Label className="text-xs">подгруппа</Label>
                        <Combobox
                            size="sm"
                            data={subgroups || []} value={field.state.value}
                            modal={true}
                            className="max-w-[188px]"
                            onChange={(value) => field.handleChange(value || '')}>
                        </Combobox>
                    </LabelGroup>)}
            </form.Field>
        </form>
    )
}