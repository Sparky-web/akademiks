"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { Button } from "~/components/ui/button"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Separator } from "~/components/ui/separator"
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { UpdateReport } from "~/server/api/routers/schedule/_lib/utils/update-schedule"

import Card, { CardTitle } from "../../card"
import { CardContent } from "~/components/ui/card"
import { cn } from "~/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"

interface ScheduleChangeReportProps {
  data?: UpdateReport,
  isOpen?: boolean,
  onClose?: () => void
}

export function UpdateReport({ data, isOpen, onOpenChange }: ScheduleChangeReportProps) {
  if (!data) {
    return null // or return an error message component
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* <DialogTrigger asChild>
        <Button variant="outline">Просмотр отчета об изменениях</Button>
      </DialogTrigger> */}
      <DialogContent className="max-w-7xl max-h-[calc(100vh-24px)] overflow-y-auto text-sm">
        <DialogHeader>
          <DialogTitle>Отчет об изменениях в расписании</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full pr-4">
          {/* {(data.error || data.notificationError) && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {data.error && <p>{data.error}</p>}
                {data.notificationError && <p>{data.notificationError}</p>}
              </AlertDescription>
            </Alert>
          )} */}

          {data.error && <Alert variant={'destructive'} className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка обновления расписания</AlertTitle>
            <AlertDescription>
              {data.error}
            </AlertDescription>
          </Alert>}
          {data.notificationError && <Alert variant={'destructive'} className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка отправки уведомлений</AlertTitle>
            <AlertDescription>
              {data.notificationError}
            </AlertDescription>
          </Alert>}

          <div className="space-y-4">
            {data.summary && <SummarySection summary={data.summary} />}
            <Separator />
            {data.result && <ChangeDetailsSection result={data.result} />}
            <Separator />
            {data.notificationResult && <NotificationResultsSection notificationResult={data.notificationResult} />}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function SummarySection({ summary }: { summary: NonNullable<ScheduleChangeReportProps["data"]>["summary"] }) {
  return (
    <>
      <Card>
        <CardTitle>Сводка</CardTitle>
        <div className="grid grid-cols-2 gap-2">
          <div>Добавлено: {summary.added ?? 0}</div>
          <div>Обновлено: {summary.updated ?? 0}</div>
          <div>Удалено: {summary.deleted ?? 0}</div>
          <div>Отправлено уведомлений: {summary.notificationsSent ?? 0}</div>
          <div>Ошибок уведомлений: {summary.notificationsError ?? 0}</div>
        </div>
      </Card>
      <Card className="grid grid-cols-2 gap-4">
        {/* <table>
          <thead>
            <tr>
              <th className="text-left">Группа</th>
              <th className="text-left">Изменения</th>
              <th className="text-left">Отправлено</th>
              <th className="text-left">Ошибки</th>
            </tr>
          </thead>
          <tbody>
            {summary.groupsAffected?.map((group, index) => (
              <tr key={index}>
                <td>{group.title}</td>
                <td>{group.count}</td>
                <td>{group.notificationsSent}</td>
                <td>{group.notificationsError}</td>
              </tr>
            )) ?? (
                <tr>
                  <td colSpan={4}>Нет затронутых групп</td>
                </tr>
              )}
          </tbody>
        </table>
        <table>
          <thead>
            <tr>
              <th className="text-left">Преподаватель</th>
              <th className="text-left">Изменения</th>
              <th className="text-left">Отправлено</th>
              <th className="text-left">Ошибки</th>
            </tr>
          </thead>
          <tbody className="py-3 mt-3">
            {summary.teachersAffected?.map((teacher, index) => (
              <tr key={index}>
                <td>{teacher.title}</td>
                <td>{teacher.count}</td>
                <td>{teacher.notificationsSent}</td>
                <td>{teacher.notificationsError}</td>
              </tr>
            )) ?? (
                <tr>
                  <td colSpan={4}>Нет затронутых преподавателей</td>
                </tr>
              )}
          </tbody>
        </table> */}
        <SummaryCard title="Группы" data={summary.groupsAffected} />
        <SummaryCard title="Преподаватели" data={summary.teachersAffected} />
      </Card>
    </>
  )
}

function ChangeDetailsSection({ result }: { result: NonNullable<ScheduleChangeReportProps["data"]>["result"] }) {
  if (!result || result.length === 0) {
    return <div>Нет изменений для отображения.</div>
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "add":
        return "bg-green-500/10"
      case "update":
        return "bg-yellow-500/10"
      case "delete":
        return "bg-red-500/10"
      default:
        return ""
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const [displayFull, setDisplayFull] = useState(false)

  const renderItemDetails = (item: any, isInputItem = false) => (
    <div className="space-y-1">
      <div>Группа: {item.group}</div>
      <div>Преподаватель: {item.teacher}</div>
      <div>Аудитория: {item.classroom || item.Classroom?.name}</div>
      <div>Начало: {formatDate(item.start)}</div>
      <div>Конец: {formatDate(item.end)}</div>
    </div>
  )

  return (
    <Card>
      <CardTitle>Детали изменений</CardTitle>
      <Accordion type="single" collapsible>
        {(displayFull ? result : result.slice(0, 10)).map((item, index) => (
          <AccordionItem value={`item-${index}`} key={index} className={cn(getTypeColor(item.type), 'rounded-lg ')} >
            <AccordionTrigger className="p-1 px-4 text-left ">
              {item.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
              {item.type === "delete" ? "Удаление" : item.type === "update" ? "Обновление" : "Добавление"} -{" "}
              {item.type === "update"
                ? `${item.inputItem.group} (${item.inputItem.title}) -> ${item.item.group} (${item.item.title})`
                : `${item.item.group} (${item.item.title})`}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 px-4">
                {item.status === 'error' && <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    {item.error}
                  </AlertDescription>
                </Alert>}
                <div className="grid grid-cols-2 gap-4 ">
                  <div>
                    Тип: {item.type === "delete" ? "Удаление" : item.type === "update" ? "Обновление" : "Добавление"}
                  </div>
                  <div>Статус: {item.status === "success" ? "Успешно" : "Ошибка"}</div>
                </div>
                {item.type === "update" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="">
                      <div className="font-semibold">Пара до:</div>
                      {renderItemDetails(item.inputItem)}
                    </div>
                    <div className="">
                      <div className="font-semibold">Пара после:</div>
                      {renderItemDetails(item.item)}
                    </div>
                  </div>
                ) : renderItemDetails(item.item)}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {!displayFull && result.length > 10 && <Button variant={'ghost'} className='text-xs text-center mt-2 w-full' onClick={() => setDisplayFull(true)}>Показать все</Button>}
      {displayFull && <Button variant={'ghost'} className='text-xs text-center mt-2 w-full' onClick={() => setDisplayFull(false)}>Скрыть все</Button>}
    </Card>
  )
}

function NotificationResultsSection({
  notificationResult,
}: { notificationResult: NonNullable<ScheduleChangeReportProps["data"]>["notificationResult"] }) {
  if (!notificationResult || notificationResult.length === 0) {
    return <div>Нет результатов уведомлений для отображения.</div>
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Результаты уведомлений</h3>
      <ul className="space-y-2">
        {notificationResult.map((notification, index) => (
          <li key={index} className="flex items-center space-x-2">
            {notification.status === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span>
              {notification.type === "group" ? "Группа" : "Преподаватель"}: {notification.group} - {notification.email}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SummaryCard({ title, data }: { title: string, data: any[] }) {
  const [displayFull, setDisplayFull] = useState(false)

  return (
    <Card >
      <CardTitle className='text-base'>{title}</CardTitle>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='p-1'>Название</TableHead>
            <TableHead className='p-1'>Обновлений</TableHead>
            <TableHead className='p-1 max-w-[200px]'>Отправлено уведомлений/ошибок отправки</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(displayFull ? data : data.slice(0, 10)).map((item, index) => (
            <TableRow key={index} className='p-1'>
              <TableCell className='p-1'>{item.title}</TableCell>
              <TableCell className='p-1'>{item.count}</TableCell>
              <TableCell className='p-1'>{item.notificationsSent} / {item.notificationsError}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!displayFull && Object.entries(data).length > 10 && <Button variant={'ghost'} className='text-xs text-center mt-2 w-full' onClick={() => setDisplayFull(true)}>Показать все</Button>}
    </Card>
  )
}
