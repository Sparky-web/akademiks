import { Check, Delete, DeleteIcon, Edit, TrashIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { Lesson } from "~/types/schedule";
import CreateLessonForm from "./forms/lesson-form";
import { FieldApi, FormApi, ReactFormApi } from "@tanstack/react-form";

interface ActionButtonsProps {
    // lesson: Lesson,
    // isEditing: boolean
    // setIsEditing: (isEditing: boolean) => void
    // onSave: (...props: any) => void
    // onDelete: (...props: any) => void
    field: FieldApi<any, any>
    form: FormApi<any, any> & ReactFormApi<any, any>
    lessonFormKey: string
}

export default function ActionButtons(props: ActionButtonsProps) {
    const { field, form, lessonFormKey } = props

    if (field.state.value?.isDeleted) return null

    return (
        <div className="flex gap-2">
            <form.Field name={lessonFormKey + '.isEditing'}>
                {(field) => field.state.value ? (
                    <Button
                        onClick={() => field.handleChange(false)}
                        variant="tenary" size={'xs'} className="text-green-500 bg-green-500/5 hover:bg-green-500/10 hover:text-green-500">
                        <Check className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button variant="tenary" size={'xs'}
                        onClick={() => field.handleChange(true)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                )
                }
            </form.Field>


            <form.Field name={lessonFormKey + '.isDeleted'}>
                {(field) => !field.state.value && (
                    <Button
                        onClick={() => {
                            form.setFieldValue(lessonFormKey + '.isEditing', false)
                            field.handleChange(true)
                        }}
                        variant="tenary" size={'xs'} className="text-red-500 bg-red-500/5 hover:bg-red-500/10 hover:text-red-500">
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                )}
            </form.Field>
        </div>
    )
}