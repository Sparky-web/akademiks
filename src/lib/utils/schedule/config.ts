const config = {
    days: {
        title: {
            column: 'A',
            rowStart: 1,
            values: "{date}  {weekday}"
        },
        lessons: {
            single: {
                title: {
                    columnIndex: 1,
                    rowIndex: 0
                },
                classroom: {
                    columnIndex: 4,
                    rowIndex: 0
                },
                teacher: {
                    columnIndex: 1,
                    rowIndex: 1
                }
            },
            double: {
                first: {
                    title: {
                        columnIndex: 1,
                        rowIndex: 0
                    },
                    classroom: {
                        columnIndex: 2,
                        rowIndex: 0
                    },
                    teacher: {
                        columnIndex: 1,
                        rowIndex: 1
                    }
                },
                second: {
                    title: {
                        columnIndex: 3,
                        rowIndex: 0
                    },
                    classroom: {
                        columnIndex: 4,
                        rowIndex: 0
                    },
                    teacher: {
                        columnIndex: 3,
                        rowIndex: 1
                    }
                }
            },
            length: 2
        },
        rowStart: 7,
        length: 14,
    },
    groups: {
        title: {
            rowStart: 5
        },
        columnStart: 'E',
        length: 5
    },
    timetable: [
        { "index": 1, "start": "08:30", "end": "10:00" },
        { "index": 2, "start": "10:10", "end": "11:40" },
        { "index": 3, "start": "12:10", "end": "13:40" },
        { "index": 4, "start": "14:10", "end": "15:40" },
        { "index": 5, "start": "16:00", "end": "17:30" },
        { "index": 6, "start": "17:40", "end": "19:10" },
        { "index": 7, "start": "19:20", "end": "20:50" }
    ]
}

export default config