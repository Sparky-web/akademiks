const ExcelJS = require('exceljs');
const dayjs = require('dayjs');
require('dayjs/locale/ru');
dayjs.locale('ru');

const fs = require('fs');

const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

async function generateScheduleFromTemplate(inputPath, outputPath, schedulesArray) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);

  const templateSheet = workbook.getWorksheet(1);

  for (const schedule of schedulesArray) {
    const groupTitle = schedule.group.title;
    const sheet = workbook.addWorksheet(groupTitle);

    // копирование всего из шаблона
    templateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = sheet.getRow(rowNumber);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);
        newCell.value = cell.value;
        newCell.style = JSON.parse(JSON.stringify(cell.style)); // глубокое копирование стиля
      });
      newRow.height = row.height;
    });
    sheet.columns = templateSheet.columns.map(col => ({ ...col }));

    // заполнение расписания
    for (const dayBlock of schedule.data) {
      const date = dayjs(dayBlock.start);
      const weekday = date.format('dddd'); // день недели
      const rowIndex = WEEKDAYS.indexOf(weekday); // 0 (вс) - 6 (сб)
      if (rowIndex === -1 || rowIndex === 0) continue; // пропускаем воскресенье

      const excelRow = sheet.getRow(rowIndex + 2); // сдвиг: первая строка — заголовок

      for (const lesson of dayBlock.lessons) {
        const colIndex = lesson.index + 1;
        const text = `${lesson.title}\n${lesson.Classroom.name} ауд.\n${lesson.Teacher.name}`;
        const cell = excelRow.getCell(colIndex);
        cell.value = text;
        cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
      }
    }
  }

  // удалить шаблон
  workbook.removeWorksheet(templateSheet.id);

  // сохранить
  await workbook.xlsx.writeFile(outputPath);
}

// пример запуска
const schedules = require('./schedule.json'); // сюда положи массив расписаний

generateScheduleFromTemplate('./Ои.xlsx', './output.xlsx', schedules)
  .then(() => console.log('✅ Готово: output.xlsx'))
  .catch(console.error);
