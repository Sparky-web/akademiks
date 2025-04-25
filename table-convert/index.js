const ExcelJS = require('exceljs');
const path = require('path');

// Пути к файлам
const excelPath = path.join(__dirname, 'Ои.xlsx');
const jsonData = require('./data.json');

// Настройки таблицы
const templateStartRow = 3;
const groupTitleRow = 5;
const startRow = 7;
const rowsPerDay = 14;
const lessonsPerDay = 7;
const baseGroupStartCol = 4; // D = 4
const groupColWidth = 4;

// вспомогательные функции
function colToNumber(col) {
  let num = 0;
  for (let i = 0; i < col.length; i++) {
    num = num * 26 + (col.charCodeAt(i) - 64);
  }
  return num;
}

function numberToCol(num) {
  let col = '';
  while (num > 0) {
    const rem = (num - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    num = Math.floor((num - 1) / 26);
  }
  return col;
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const sheet = workbook.worksheets[0];

  // Проверка: массив расписаний или один объект?

  const schedules = Array.isArray(jsonData) ? jsonData : [jsonData];


  const groupMap = schedules.map((s) => ({
    id: s.group.id,
    title: s.group.title,
    data: s.data,
  }));

  const mergedCellsToCopy = [];

  for (const [range, rangeObj] of Object.entries(sheet._merges)) {
    const { left, right, top, bottom } = rangeObj.model;

    if (left >= baseGroupStartCol && right <= baseGroupStartCol + groupColWidth - 1
      && (left !== right || top !== bottom)
    ) {
      mergedCellsToCopy.push(rangeObj.model);
    }
  }

  // Копируем шаблонную область расписания для всех групп
  for (let i = 1; i < groupMap.length; i++) {
    const fromStartCol = baseGroupStartCol;
    const toStartCol = baseGroupStartCol + i * groupColWidth;

    for (let row = templateStartRow; row < sheet.rowCount + 1; row++) {
      for (let offset = 0; offset < groupColWidth; offset++) {
        const sourceCell = sheet.getRow(row).getCell(fromStartCol + offset);
        const targetCell = sheet.getRow(row).getCell(toStartCol + offset);

        targetCell.value = sourceCell.value;
        targetCell.style = { ...sourceCell.style };
        targetCell.font = sourceCell.font;
        targetCell.alignment = sourceCell.alignment;
        targetCell.border = sourceCell.border;
        targetCell.fill = sourceCell.fill;
      }
    }

    for (let offset = 0; offset < groupColWidth; offset++) {
      const col = sheet?.getColumn(fromStartCol + offset);
      const destCol = sheet?.getColumn(toStartCol + offset);
      if (!col) continue;
      if (!destCol) continue;

      destCol.width = col.width;
    }

    sheet.getRow(groupTitleRow).getCell(toStartCol).value = groupMap[i].title;
  }
  // Заголовок группы (на строку выше — обычно 6)

  for (const merged of mergedCellsToCopy) {
    for (let i = 1; i < groupMap.length; i++) {

      const colOffset = i * groupColWidth;

      const newLeft = merged.left + colOffset;
      const newRight = merged.right + colOffset;

      const startCell = `${numberToCol(newLeft)}${merged.top}`;
      const endCell = `${numberToCol(newRight)}${merged.bottom}`;
      const newRange = `${startCell}:${endCell}`;

      sheet.mergeCells(newRange);
    }
  }

  // Заполняем расписание
  for (let groupIndex = 0; groupIndex < groupMap.length; groupIndex++) {
    const group = groupMap[groupIndex];
    const groupOffset = baseGroupStartCol + groupIndex * groupColWidth;

    for (let dayIndex = 0; dayIndex < group.data.length; dayIndex++) {
      const day = group.data[dayIndex];

      for (const lesson of day.lessons) {
        const lessonRowStart = startRow + dayIndex * rowsPerDay + (lesson.index - 1) * 2;
        const subjectCell = sheet.getRow(lessonRowStart).getCell(groupOffset);
        const teacherCell = sheet.getRow(lessonRowStart + 1).getCell(groupOffset);
        const classroomCell = sheet.getRow(lessonRowStart + 1).getCell(groupOffset + 2);

        subjectCell.value = lesson.title;
        teacherCell.value = lesson.Teacher.name;
        classroomCell.value = lesson.Classroom.name;
      }
    }
  }

  const output = path.join(__dirname, 'Ои_заполнено.xlsx');
  await workbook.xlsx.writeFile(output);
  console.log(`Готово! Сохранено в ${output}`);
}

main().catch(console.error);
