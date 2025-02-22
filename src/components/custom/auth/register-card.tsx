'use client'

import Card, { CardTitle } from "~/components/custom/card"
import { H1, H2, H3, P } from "~/components/ui/typography"
import Logo from "~/app/_lib/images/urtk-logo.png"
import Image from "next/image"
import { Label } from "~/components/ui/label"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import Link from "next/link"
import { useState } from "react"
import { getSession, signIn } from "next-auth/react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "../../../app/_lib/client-store"
import { useForm } from "@tanstack/react-form"
import { zodValidator } from "@tanstack/zod-form-adapter"
import TextFormField from "../text-form-field"
import { z } from "~/lib/utils/zod-russian"
import { Combobox } from "../combobox"
import { cn } from "~/lib/utils"
import { api } from "~/trpc/react"
import { setUser } from "../../../app/_lib/client-store/_lib/slices/user"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"

export default function LoginCard() {
    const groups = useAppSelector(e => e.schedule.groups)
    const teachers = useAppSelector(e => e.schedule.teachers)

    const { mutateAsync: register } = api.auth.register.useMutation();
    const { mutateAsync: update } = api.user.update.useMutation()

    const dispatch = useAppDispatch()

    const form = useForm({
        defaultValues: {
            groupId: null,
            teacherId: null,
            role: 1,
            name: '',
            email: '',
            password: '',
            confirmPassword: '',
        },
        onSubmit: async (data) => {
            try {
                if (!data.value.password || !data.value.confirmPassword) throw new Error('пароли не совпадают')

                const { name, email, password } = data.value

                await register({ name, email, password });

                const res = await signIn('credentials', {
                    email,
                    password,
                    redirect: false
                });

                if (res?.error) {
                    console.error(res.error)
                    throw new Error(res.error)
                }

                await update({
                    role: data.value.role,
                    groupId: data.value.groupId,
                    teacherId: data.value.teacherId,
                    email,
                    name,
                })

                const session = await getSession()

                if (session?.user) {
                    dispatch(setUser(session.user))
                }

                toast.success('Регистрация прошла успешно')
                form.reset()

                navigation.push('/lk/my-schedule')
            } catch (e) {
                toast.error('Ошибка регистрации: ' + e.message)
            }
        },
        validatorAdapter: zodValidator(),
    })

    const navigation = useRouter()

    return (
        <Card className="w-[500px] max-w-full p-6">
            <form className="grid gap-9" onSubmit={e => {
                e.preventDefault()
                form.handleSubmit()
            }}>
                <div className="flex gap-4 justify-between flex-wrap">
                    <H2>Академикс</H2>
                    <Image src={Logo} alt="logo" width={136} height={26} objectFit="contain" />
                </div>

                <div className="grid gap-4">
                    <div className="grid gap-2 md:text-center">
                        <H1 className="max-md:text-[20px] text-[24px]">Регистрация на платформе</H1>
                        <P className="leading-6 max-md:text-[14px] max-md:leading-5">
                            Сохранение вашего расписания, избранные расписания и больше
                        </P>
                    </div>
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

                        <form.Field name="password"
                            validators={{
                                onChange: z.string().min(8)
                            }}
                        >
                            {field => <TextFormField field={field} label="Пароль" inputProps={{ placeholder: "Ваш пароль", type: 'password' }} />}
                        </form.Field>

                        <form.Field name="confirmPassword"
                            validators={{
                                onChange: z.string().min(8)
                            }}
                        >
                            {field => <TextFormField field={field} label="Повторите пароль" inputProps={{ placeholder: "Ваш пароль", type: 'password' }} />}
                        </form.Field>

                        <div className="grid gap-1.5 mt-2">
                            <Label>Выберите ваше расписание</Label>
                            {groups && teachers && <Card className="bg-muted rounded-md">
                                <div className="grid gap-3">
                                    <form.Field name="role"
                                        validators={{
                                            onChange: z.number()
                                        }}
                                    >
                                        {(field) => (
                                            <div className="grid gap-1.5">
                                                <Label>Роль</Label>
                                                <Select
                                                    value={field.state.value}
                                                    onValueChange={(e) => {
                                                        field.handleChange(+e)
                                                        form.setFieldValue('groupId', null)
                                                        form.setFieldValue('teacherId', null)
                                                    }}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Выберите роль" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {[{ value: 1, label: 'Студент' }, { value: 2, label: 'Преподаватель' }].map(e => (
                                                            <SelectItem key={e.value} value={e.value}>
                                                                {e.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {!!field.state.meta.errors.length && <p className="text-red-500 text-xs font-medium">{field.state.meta.errors.map(e => e?.message).join(', ')}</p>}
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
                                </div>
                            </Card>}
                        </div>

                        <form.Subscribe selector={(form) => [form.isPristine, form.isSubmitting, form.canSubmit]}>
                            {([isPristine, isSubmitting, canSubmit]) => (
                                <Button disabled={isPristine || isSubmitting || !canSubmit} type="submit" size={'lg'}>
                                    Зарегистрироваться
                                </Button>
                            )}
                        </form.Subscribe>

                        <P className="leading-6 md:text-center text-sm mt-3">
                            Если у Вас уже есть учетная запись - <Link href={'/auth/signin'} className="text-primary">
                                нажмите здесь, чтобы войти
                            </Link>
                        </P>
                    </div>
                </div>
            </form>
        </Card>
    )
}
