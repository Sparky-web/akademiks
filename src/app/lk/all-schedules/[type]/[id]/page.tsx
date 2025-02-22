import { ChevronLeft } from "lucide-react"
import DateTime from "~/lib/utils/datetime"
import Link from "next/link"
import Schedule from "~/components/custom/schedule"
import { Button } from "~/components/ui/button"
import { api } from "~/trpc/server"
import AddToFavourite from "./_lib/componetns/add-to-favourite"

interface SchedulePageProps {
    params: Promise<{
        type: string,
        id: string
    }>
}

export default async function SchedulePage(props: SchedulePageProps) {
    const params = await props.params;
    if (params.type === 'teacher') {
        void (await api.schedule.get.prefetch({
            groupId: params.id,
            weekStart: DateTime.now().startOf('week').toJSDate(),
        }))
    } else if (params.type === 'student') {
        void (await api.schedule.get.prefetch({
            groupId: params.id,
            weekStart: DateTime.now().startOf('week').toJSDate(),
        }))
    } else {
        throw new Error('Неверный тип расписания')
    }


    return (
        <div className="grid gap-6">
            <div className="flex justify-between items-center gap-2">
                <Link href={`/lk/all-schedules`}>
                    <Button variant="ghost" className="font-medium p-0">
                        <ChevronLeft className="h-5 w-5" />
                        вернуться
                    </Button>
                </Link>
                <AddToFavourite type={params.type} groupId={params.id} teacherId={params.id} />
            </div>
            <Schedule groupId={params.id} type={params.type} teacherId={params.id} />
        </div>
    )
}