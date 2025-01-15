'use client'

import { useState } from 'react'
import { DateTime } from 'luxon'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table"
import { ScrollArea, ScrollBar } from "~/components/ui/scroll-area"
import { User } from '~/types/user'
import { Button } from '~/components/ui/button'
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { api } from '~/trpc/react'
type SortDirection = 'asc' | 'desc' | null

const columns = [
  { key: 'name', label: 'Имя' },
  { key: 'email', label: 'Эл. почта' },
  { key: 'role', label: 'Роль' },
  { key: 'isAdmin', label: 'Админ' },
  { key: 'groupId', label: 'Группа' },
  { key: 'teacherId', label: 'Преподаватель' },
]

export default function UserTable() {
    const [page, setPage] = useState(0)
    const [sortColumn, setSortColumn] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  
    const [_, { data }] = api.users.get.useSuspenseQuery({
      start: page * 10,
      limit: 10,
      orderBy: sortColumn,
      orderDirection: sortDirection,
    })
  
    const users = data?.users || []
    const totalPages = Math.ceil((data?.totalCount || 0) / 10)
  
    const getRoleText = (role: number) => {
      return role === 1 ? 'Студент' : role === 2 ? 'Преподаватель' : 'Неизвестно'
    }
  
    const formatDate = (date: string | null) => {
      return date 
        ? DateTime.fromISO(date).setLocale('ru').toLocaleString(DateTime.DATETIME_SHORT) 
        : 'Не подтверждена'
    }
  
    const handleSort = (column: string) => {
      if (sortColumn === column) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')
        if (sortDirection === 'desc') {
          setSortColumn(null)
        }
      } else {
        setSortColumn(column)
        setSortDirection('asc')
      }
      setPage(0)
    }
  
    const getSortIcon = (column: string) => {
      if (sortColumn !== column) return <ChevronsUpDown className="h-4 w-4" />
      if (sortDirection === 'asc') return <ChevronUp className="h-4 w-4" />
      if (sortDirection === 'desc') return <ChevronDown className="h-4 w-4" />
      return <ChevronsUpDown className="h-4 w-4" />
    }
  
    return (
      <div>
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <div className="w-full bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key} className="cursor-pointer" onClick={() => handleSort(column.key)}>
                      <div className="flex items-center gap-1">
                        {column.label}
                        {getSortIcon(column.key)}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleText(user.role)}</TableCell>
                    <TableCell>{user.isAdmin ? 'Да' : 'Нет'}</TableCell>
                    <TableCell>{user.Group?.title}</TableCell>
                    <TableCell>{user.Teacher?.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <div className="flex justify-between items-center mt-4">
          <div>
            Страница {page + 1} из {totalPages}
          </div>
          <div className="space-x-2">
            <Button
              onClick={() => setPage(prev => Math.max(0, prev - 1))}
              disabled={page === 0}
            >
              Предыдущая
            </Button>
            <Button
              onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={page === totalPages - 1}
            >
              Следующая
            </Button>
          </div>
        </div>
      </div>
    )
  }