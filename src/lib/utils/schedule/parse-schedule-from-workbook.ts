import config from "~/lib/utils/schedule/config";
import flattenSchedule from "~/lib/utils/schedule/flatten-schedule";
import getRowData from "~/lib/utils/schedule/get-row-data";
import parseStringFromTemplate from "~/lib/utils/schedule/parse-string-from-template";

export default function parseScheduleFromWorkbook(workbook: XLSX.WorkBook) {
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  let end = false;
  let dayStartIndex = config.days.rowStart;
  let days = [];

  const groupsTitleRowData = Object.values(
    getRowData(worksheet, config.groups.title.rowStart),
  );

  while (!end) {
    const dayData = getRowData(
      worksheet,
      dayStartIndex + config.days.title.rowStart - 1,
    );
    if (!dayData[config.days.title.column]) {
      end = true;
      break;
    }

    const title = dayData[config.days.title.column];
    const data = parseStringFromTemplate(config.days.title.values, title);

    const groups = [];

    // Каждый день
    for (let i = dayStartIndex; i < dayStartIndex + config.days.length; i++) {
      const rowData = getRowData(worksheet, i);
      const rowArray = Object.entries(rowData);
      const startGroups = rowArray.findIndex(
        (item) => item[0] === config.groups.columnStart,
      );
      const endGroups = rowArray.length - 1;

      let groupIndex = 0;
      for (let j = startGroups; j < endGroups; j = j + config.groups.length) {
        const groupTitle = groupsTitleRowData[j + 1];

        if (!groupTitle) continue;

        // Каждыя группа
        if (!groups[groupIndex]) {
          groups.push({
            title: groupTitle,
            rows: [],
          });
        }

        groups[groupIndex].rows.push(
          rowArray.slice(j, j + config.groups.length).map((e) => e[1]),
        );
        groupIndex++;
      }
    }

    days.push({
      date: data.date,
      groups: groups,
    });
    dayStartIndex += config.days.length;
  }

  days = days.map((day) => {
    day.groups = day.groups.map((group) => {
      const lessons = [];

      for (
        let i = 0;
        i < config.days.length;
        i = i + config.days.lessons.length
      ) {
        const lessonIndex = i / config.days.lessons.length + 1;

        const title =
          group.rows[i + config.days.lessons.single.title.rowIndex][
            config.days.lessons.single.title.columnIndex
          ];
        const classroom =
          group.rows[i + config.days.lessons.single.classroom.rowIndex][
            config.days.lessons.single.classroom.columnIndex
          ];
        const teacher =
          group.rows[i + config.days.lessons.single.teacher.rowIndex][
            config.days.lessons.single.teacher.columnIndex
          ];

        const titleFirst =
          group.rows[i + config.days.lessons.double.first.title.rowIndex][
            config.days.lessons.double.first.title.columnIndex
          ];
        const classroomFirst =
          group.rows[i + config.days.lessons.double.first.classroom.rowIndex][
            config.days.lessons.double.first.classroom.columnIndex
          ];
        const teacherFirst =
          group.rows[i + config.days.lessons.double.first.teacher.rowIndex][
            config.days.lessons.double.first.teacher.columnIndex
          ];

        const titleSecond =
          group.rows[i + config.days.lessons.double.second.title.rowIndex][
            config.days.lessons.double.second.title.columnIndex
          ];
        const classroomSecond =
          group.rows[i + config.days.lessons.double.second.classroom.rowIndex][
            config.days.lessons.double.second.classroom.columnIndex
          ];
        const teacherSecond =
          group.rows[i + config.days.lessons.double.second.teacher.rowIndex][
            config.days.lessons.double.second.teacher.columnIndex
          ];

        if (classroomFirst) {
          lessons.push({
            title: titleFirst,
            index: lessonIndex,
            classroom: classroomFirst,
            teacher: teacherFirst,
            group: 1,
          });
        }

        if (teacherSecond) {
          lessons.push({
            title: titleSecond,
            index: lessonIndex,
            classroom: classroomSecond,
            teacher: teacherSecond,
            group: 2,
          });
        }

        if (classroomFirst && !teacherSecond) {
          lessons.push({
            title: null,
            index: lessonIndex,
            group: 2,
          });
        }

        if (!classroomFirst && teacherSecond) {
          lessons.push({
            title: null,
            index: lessonIndex,
            group: 1,
          });
        }

        if (!classroomFirst && !teacherSecond && title) {
          lessons.push({
            title: title,
            index: lessonIndex,
            classroom: classroom,
            teacher: teacher,
            group: null,
          });
        }

        if (!classroomFirst && !teacherSecond && !title) {
          lessons.push({
            title: null,
            index: lessonIndex,
          });
        }
      }

      group.lessons = lessons;
      delete group.rows;

      return group;
    });
    return day;
  });

  return flattenSchedule(days);
}
