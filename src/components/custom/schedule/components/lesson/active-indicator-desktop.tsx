import DateTime from "~/lib/utils/datetime"
import { ActiveIndicatiorProps, formatDiff } from "./active-indicatior";

export default function ActiveIndicatiorDesktop(props: ActiveIndicatiorProps) {
    const {start, end} = props

    let type: 'start' | 'end' = 'start'
    if (DateTime.fromJSDate(start) < DateTime.now()) type = 'end'

    return (
        <div className="text-primary text-xs font-medium flex gap-4 items-center mt-3 p-3">

            {type === 'start' && <>
                начинается {formatDiff(DateTime.fromJSDate(start))}
            </>}

            {type === 'end' && <>
                заканчивается {formatDiff(DateTime.fromJSDate(end))}
            </>}

            <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/50 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary/70"></span>
            </span>
            {/* Pulsating indicator with circle inside */}
            {/* <div className="relative "></div> */}

        </div>
    )
}