'use client'
import { useEffect, useState } from "react";
import Dropzone from "~/components/custom/dropzone";
import PageTitle from "~/components/custom/page-title";
import { H2, H4, P } from "~/components/ui/typography";
import parseSchedule from "./_lib/utils/parse-schedule";
import Summary from "./_lib/componetns/summary";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { api } from "~/trpc/react";
import { Loader2 } from "lucide-react";
import DifferenceView from "./_lib/componetns/difference-view";
import { useAppSelector } from "~/app/_lib/client-store";
import InitializationErrorCard from "~/components/custom/errors/initialization-error-card";
import { UpdateReport } from "~/components/custom/schedule/components/update-report";
import Visibility from "./_lib/componetns/visibility";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";

export default function Page() {
    const user = useAppSelector(e => e.user?.user)

    if (!user || !user.isAdmin) return <InitializationErrorCard message={"Вы не администратор, доступ запрещен"} />

    const [files, setFiles] = useState<File[]>([])

    const [result, setResult] = useState<any>(null)

    const [report, setReport] = useState<any>(null)

    const [difference, setDifference] = useState<any>(null)

    const [displayForStudents, setDisplayForStudents] = useState(false)

    const { mutateAsync: updateSchedule, isPending } = api.schedule.update.useMutation()

    const { mutateAsync: getDifference, isPending: isPendingDifference } = api.schedule.difference.useMutation()

    useEffect(() => {
        setDifference(null)
        async function parse() {
            let res = []
            for (let file of files) {
                try {
                    const parsed = await parseSchedule(file)
                    res.push(...parsed)
                } catch (e) {
                    toast.error('Ошибка парсинга файла: ' + file.name + ', ' + e.message)
                }
            }

            setResult(res)
        }
        parse()
    }, [files])

    return (
        <div className="grid gap-6 ">
            <PageTitle>
                Управление расписаниями
            </PageTitle>

            <Visibility />

            <div className="grid lg:grid-cols-2 gap-6 max-w-full">
                <div className="grid gap-4">
                    <div className="grid gap-3">
                        <H4>Выберите файлы с расписанием</H4>
                        <P className="text-muted-foreground">Прикрепите файлы в формате xlsx в соответствии с установленным шаблоном</P>
                    </div>
                    <Dropzone files={files} setFiles={setFiles} />
                </div>
            </div>

            {!!result?.length && <Summary scheduleData={result} />}

            {!!result?.length && <Button className="mt-2 max-w-[300px]" variant="default" size="lg" onClick={() => getDifference(result).then(setDifference)}>
                {isPendingDifference && <Loader2 className="animate-spin mr-2" />}
                Предпросмотр изменений
            </Button>}

            {difference && <DifferenceView updated={difference} />}

            {!!result?.length && <div className="flex gap-2 items-center mt-3">
                <Checkbox id="display_for_students_1" checked={displayForStudents} onCheckedChange={(checked) => setDisplayForStudents(checked)} />
                <Label htmlFor="display_for_students_1">
                    Показывать пары для студентов
                </Label>
            </div>}


            {!!result?.length && <Button
                disabled={isPending}
                className="max-w-[300px]" variant="default" size="lg" onClick={async () => {
                    setReport(null)

                    try {
                        const res = await updateSchedule({
                            shouldDisplayForStudents: displayForStudents,
                            updates: result
                        })

                        toast.success('Расписание успешно обновлено')
                        setResult(null)
                        setFiles([])
                        setReport(res)
                    } catch (e) {
                        toast.error('Ошибка обновления расписания: ' + e.message)
                    }

                }}>
                {isPending && <Loader2 className="animate-spin mr-2" />}
                Загрузить расписание
            </Button>}

            {report && <UpdateReport data={report}
                isOpen={!!report}
                onOpenChange={() => setReport(null)}
            />}
        </div>
    )
}