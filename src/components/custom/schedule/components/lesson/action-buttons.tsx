import { Check, Delete, Edit, TrashIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from "~/components/ui/dialog";
import { Lesson } from "~/types/schedule";
import CreateLessonForm from "./forms/lesson-form";

interface ActionButtonsProps {
    lesson: Lesson,
    isEditing: boolean
    setIsEditing: (isEditing: boolean) => void
    onSave: (...props: any) => void
}

export default function ActionButtons(props: ActionButtonsProps) {
    return (
        <div className="flex gap-2">
            {props.isEditing ?
                <Button
                    onClick={() => props.onSave()}
                    variant="tenary" size={'xs'} className="text-green-500 bg-green-500/5 hover:bg-green-500/10 hover:text-green-500">
                    <Check className="h-4 w-4" />
                </Button> : <Button variant="tenary" size={'xs'}
                    onClick={() => props.setIsEditing(true)}
                >
                    <Edit className="h-4 w-4" />
                </Button>
            }
            <Button variant="tenary" size={'xs'} className="text-red-500 bg-red-500/5 hover:bg-red-500/10 hover:text-red-500">
                <TrashIcon className="h-4 w-4" />
            </Button>
        </div>
    )
}