'use client'
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Card, { CardTitle } from "~/components/custom/card";
import { UpdateReport } from "~/components/custom/schedule/components/update-report";
import WeekSelector from "~/components/custom/schedule/components/week-picker-desktop";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import DateTime from "~/lib/utils/datetime";
import { api } from "~/trpc/react";

export default function Visibility() {
    const [weekStart, setWeekStart] = useState(DateTime.now().weekday === 7 ?
        DateTime.now().startOf("week").plus({ week: 1 }).toJSDate()
        : DateTime.now().startOf("week").toJSDate())

    const [shouldDisplayForStudents, setShouldDisplayForStudents] = useState(true)

    const [report, setReport] = useState<any>(null)

    const { data, isPending } = api.schedule.getIsVisible.useQuery({
        start: weekStart,
        end: DateTime.fromJSDate(weekStart).plus({ week: 1 }).toJSDate()
    })

    const { mutateAsync: changeVisibility, isPending: isPendingChangeVisibility } = api.schedule.changeVisibility.useMutation()

    useEffect(() => {
        if (typeof data === 'undefined') return
        setShouldDisplayForStudents(data.isVisible)
    }, [data])
    const utils = api.useUtils()

    const handleChange = async (checked: boolean) => {
        try {
            const res = await changeVisibility({
                dstart: weekStart,
                dend: DateTime.fromJSDate(weekStart).plus({ week: 1 }).toJSDate(),
                shouldDisplayForStudents: checked
            })

            setReport(res)

            utils.schedule.getIsVisible.invalidate()

            toast.success('Успешно')
        } catch (e) {
            toast.error('Ошибка изменения видимости пар для студентов: ' + e.message)
        }
    }

    return (
        <Card className="content-start">
            <CardTitle>Видимость пар для студентов</CardTitle>
            <div className="w-fit flex items-center gap-4 h-[60px]">
                <WeekSelector
                    weekStart={weekStart}
                    onChange={setWeekStart}
                />
                {isPending && <Loader2 className="animate-spin" />}
                {!isPending && !data?.isScheduleExists &&
                    <Card className="bg-amber-500/5 max-w-[400px]">
                        <div className="text-sm font-medium text-amber-500 flex items-center ">
                            <AlertCircle className="w-5 h-5 mr-2 inline-block" />
                            На этой неделе пары не найдены
                        </div>
                    </Card>
                }
            </div>

            {!isPending && <div className="flex items-center gap-3">
                <Label htmlFor="show_for_students" >
                    Показывать пары для студентов
                </Label>
                <Switch
                    disabled={isPending || isPendingChangeVisibility || !data?.isScheduleExists}
                    checked={shouldDisplayForStudents}
                    id="show_for_students"
                    onCheckedChange={(checked) => handleChange(checked)}
                />
            </div>}

            {report && <UpdateReport data={report}
                isOpen={!!report}
                onOpenChange={() => setReport(null)}
            />}
        </Card>
    )
}