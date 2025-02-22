'use client'

import { useState } from "react"
import { FieldApi, useForm } from "@tanstack/react-form"
import { api } from "~/trpc/react"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { useAppDispatch, useAppSelector } from "~/app/_lib/client-store"
import Card, { CardTitle } from "~/components/custom/card"
import { Label } from "~/components/ui/label"
import { Input } from "~/components/ui/input"
import { Combobox } from "~/components/custom/combobox"
import { z } from "~/lib/utils/zod-russian"
import { zodValidator } from '@tanstack/zod-form-adapter'
import { setUser } from "~/app/_lib/client-store/_lib/slices/user"
import { toast } from "sonner"
import TextFormField from "~/components/custom/text-form-field"



export default function EditData() {
    const user = useAppSelector(e => e.user?.user)
    const dispatch = useAppDispatch()
    const { groups, teachers } = useAppSelector(e => e.schedule)

    const { mutateAsync } = api.user.update.useMutation()

    const form = useForm({
        defaultValues: {
            groupId: user?.Group?.id,
            teacherId: user?.teacherId,
            role: user?.role,
            name: user?.name,
            email: user?.email,
            password: null,
        },

        onSubmit: async (data) => {
            try {
                const user = await mutateAsync(data.value)
                dispatch(setUser(user))

                console.log(data)
                toast.success('Данные обновлены')
                form.reset()
            } catch (e) {
                toast.error('Ошибка обновления данных: ' + e.message)
            }
        },
        validatorAdapter: zodValidator(),
    })


    return (
        <form className="grid gap-6 lg:grid-cols-2" onSubmit={e => {
            e.preventDefault()
            form.handleSubmit()
        }}>
            <Card>
                <CardTitle>Личные данные</CardTitle>
                <div className="grid gap-3">
                    <form.Field name="name"

                        validators={{
                            onChange: z.string().min(1)
                        }}
                    >
                        {field => <TextFormField field={field} label="Имя" inputProps={{ placeholder: "Ваше имя" }} />}
                    </form.Field>
                    <form.Field name="email"
                        validators={{
                            onChange: z.string().email()
                        }}
                    >
                        {field => <TextFormField field={field} label="Email" inputProps={{ placeholder: "Ваш email" }} />}
                    </form.Field>
                </div>
            </Card>

            {groups && teachers && <Card>
                <CardTitle>Ваше расписание</CardTitle>
                <div className="grid gap-3">
                    <form.Field name="role"
                        validators={{
                            onChange: z.number()
                        }}>
                        {(field) => (
                            <div className="grid gap-1.5">
                                <Label>Роль</Label>
                                <Combobox
                                    data={[{ value: 1, label: 'Студент' }, { value: 2, label: 'Преподаватель' }]}
                                    value={field.state.value}
                                    onChange={(e) => {
                                        field.handleChange(e)
                                        form.setFieldValue('groupId', null)
                                        form.setFieldValue('teacherId', null)
                                    }}
                                />
                                {!!field.state.meta.errors.length && <p className="text-red-500 text-xs font-medium">{field.state.meta.errors.map(e => e.message).join(', ')}</p>}
                            </div>
                        )}
                    </form.Field>

                    <form.Subscribe selector={(form) => form.values.role}>
                        {(role) => <>
                            <form.Field name="groupId" validators={{
                                onChange: z.any().superRefine((groupId, ctx) => {
                                    if (role === 1 && !groupId) ctx.addIssue({
                                        code: 'custom',
                                        message: "Обязательное поле"
                                    });
                                })
                            }} >
                                {(field) => (
                                    <div className={cn("grid gap-1.5", role !== 1 && 'hidden')}>
                                        <Label>Группа</Label>
                                        <Combobox
                                            data={groups.map(group => ({ value: group.id, label: group.title }))}
                                            value={field.state.value}
                                            onChange={(e) => {
                                                field.handleChange(e)
                                            }}
                                        />
                                        {!!field.state.meta.errors?.length && <p className="text-red-500 text-xs font-medium">{field.state.meta.errors.map(e => e.message).join(', ')}</p>}
                                    </div>
                                )}
                            </form.Field>

                            <form.Field name="teacherId"
                                validators={{
                                    onChange: z.any().superRefine((groupId, ctx) => {
                                        if (role === 2 && !groupId) ctx.addIssue({
                                            code: 'custom',
                                            message: "Обязательное поле"
                                        });
                                    })
                                }}
                            >
                                {(field) => (
                                    <div className={cn("grid gap-1.5", role !== 2 && 'hidden')}>
                                        <Label>Преподаватель</Label>
                                        <Combobox
                                            data={teachers.map(teacher => ({ value: teacher.id, label: teacher.name }))}
                                            value={field.state.value}
                                            onChange={field.handleChange}
                                        />
                                        {!!field.state.meta.errors?.length && <p className="text-red-500 text-xs font-medium">{field.state.meta.errors.map(e => e.message).join(', ')}</p>}
                                    </div>
                                )}
                            </form.Field>

                        </>}
                    </form.Subscribe>



                    {/* <form.Field name="groupId">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <Label>Группа</Label>
                                <Combobox
                                    data={groups.map(group => ({ value: group.id, label: group.title }))}
                                    value={field.state.value}
                                    onChange={field.handleChange}
                                />
                            </div>
                        )}
                    </form.Field> */}
                </div>
            </Card>}

            <form.Subscribe selector={(form) => [form.isPristine, form.isSubmitting, form.canSubmit]}>
                {([isPristine, isSubmitting, canSubmit]) => (
                    <Button disabled={isPristine || isSubmitting || !canSubmit} type="submit">
                        Сохранить
                    </Button>
                )}
            </form.Subscribe>
        </form >
    )
}




