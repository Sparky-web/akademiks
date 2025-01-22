'use client'

import * as XLSX from 'xlsx';
import fileToArrayBuffer from './file-to-array-buffer';
import parseScheduleFromWorkbook  from '~/lib/utils/schedule/parse-schedule-from-workbook';
import parseScheduleFromWorkbookOld from '~/lib/utils/schedule/parse-schedule-from-workbook-old';


export interface SheetSchedule {
    date: string
    groups: Group[]
}

interface Group {
    title: string
    lessons: Lesson[]
}

interface Lesson {
    title: string
    index: number
    classroom: string
    teacher: string
    group: number | null
}


export default async function parseSchedule(file: File) {
    if (file.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' && file.type !== 'application/vnd.ms-excel') {
        throw new Error('неверный тип файла, файл должен быть в формате xlsx')
    }

    const data = await fileToArrayBuffer(file);

    const workbook = XLSX.read(data, { type: 'array' });

    if(file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return parseScheduleFromWorkbook(workbook)
    } else if(file.type === 'application/vnd.ms-excel') {
        return parseScheduleFromWorkbookOld(workbook)
    }
}
