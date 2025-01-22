'use client'

import { useState, useEffect } from 'react'
import DateTime from "~/lib/utils/datetime"
import { Button } from "~/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface WeekSelectorProps {
  weekStart: Date
  onChange: (date: Date) => void
}

export default function WeekSelector({ weekStart, onChange }: WeekSelectorProps) {
  const [currentWeek, setCurrentWeek] = useState(DateTime.fromJSDate(weekStart).setLocale('ru'))

  useEffect(() => {
    setCurrentWeek(DateTime.fromJSDate(weekStart).setLocale('ru'))
  }, [weekStart])

  const goToPreviousWeek = () => {
    const newWeek = currentWeek.minus({ weeks: 1 })
    setCurrentWeek(newWeek)
    onChange(newWeek.toJSDate())
  }

  const goToNextWeek = () => {
    const newWeek = currentWeek.plus({ weeks: 1 })
    setCurrentWeek(newWeek)
    onChange(newWeek.toJSDate())
  }

  const weekEnd = currentWeek.endOf('week')

  const formattedWeek = `${currentWeek.toFormat('d MMMM')} - ${weekEnd.toFormat('d MMMM yyyy')}`

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant="ghost"
          onClick={goToPreviousWeek}
          aria-label="Предыдущая неделя"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center min-w-[200px]">
          <p className="text-sm font-medium whitespace-nowrap">{formattedWeek}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWeek}
          aria-label="Следующая неделя"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}