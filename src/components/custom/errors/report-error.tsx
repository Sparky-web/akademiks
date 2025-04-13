"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
// import { useToast } from "~/components/ui/use-toast"
import { toast } from "sonner";
import { useMediaQuery } from "usehooks-ts";
// import { trpc } from "~/utils/trpc"
import { api } from "~/trpc/react";
import { AlertCircle } from "lucide-react";
import { P } from "~/components/ui/typography";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import Link from "next/link";

const formSchema = z.object({
  screenshot: z.instanceof(File).optional(),
  description: z.string().min(3, {
    message: "Описание должно содержать не менее 3-х символов.",
  }),
});

export default function ErrorReportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
    },
  });

  const errorReportMutation = api.errors.submit.useMutation({
    onSuccess: () => {
      toast.info("Отчет отправлен");
      setIsOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast.error("Ошибка" + error.message);
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();
    formData.append("description", values.description);

    if (values.screenshot) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);

        if (values.screenshot) reader.readAsDataURL(values.screenshot);
      });

      errorReportMutation.mutate({
        description: values.description,
        screenshot: {
          filename: values.screenshot.name,
          content: base64.split(",")[1],
        },
      });
    } else {
      errorReportMutation.mutate({
        description: values.description,
      });
    }
  }

  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <AlertCircle className="h-4 w-4" /> Сообщить об ошибке
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Сообщить об ошибке</DialogTitle>
            <div className="text-foreground grid gap-3 pt-3 text-left text-sm">
              <P>
                Пожалуйста, опишите проблему и прикрепите скриншот, если это
                возможно.
              </P>
              <P>
                Если у вас есть вопрос по работе платформы, или произошло что-то
                критичное, что требует немедленного исправления - пожалуйста,
                напишите в Telegram -{" "}
                <Link
                  className="text-primary underline"
                  target="_blank"
                  href={"https://t.me/vladislavbabinov"}
                >
                  @vladislavbabinov
                </Link>
              </P>
            </div>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="screenshot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Скриншот</FormLabel>
                    <FormControl>
                      <Input
                        className="h-10 text-sm"
                        type="file"
                        accept="image/*"
                        onChange={(e) => field.onChange(e.target.files?.[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание ошибки</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Опишите проблему..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={errorReportMutation.isPending}>
                  {errorReportMutation.isPending ? "Отправка..." : "Отправить"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline">
          <AlertCircle className="h-4 w-4" /> Сообщить об ошибке
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Сообщить об ошибке</DrawerTitle>
          <div className="text-foreground grid gap-3 pt-3 text-left text-sm">
            <P>
              Пожалуйста, опишите проблему и прикрепите скриншот, если это
              возможно.
            </P>
            <P>
              Если у вас есть вопрос по работе платформы, или произошло что-то
              критичное, что требует немедленного исправления - пожалуйста,
              напишите в Telegram -{" "}
              <Link
                className="text-primary underline"
                target="_blank"
                href={"https://t.me/vladislavbabinov"}
              >
                @vladislavbabinov
              </Link>
            </P>
          </div>
        </DrawerHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 px-3">
              <FormField
                control={form.control}
                name="screenshot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Скриншот</FormLabel>
                    <FormControl>
                      <Input
                        className="h-10 text-sm"
                        type="file"
                        accept="image/*"
                        onChange={(e) => field.onChange(e.target.files?.[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание ошибки</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Опишите проблему..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DrawerFooter>
              <Button type="submit" disabled={errorReportMutation.isPending}>
                {errorReportMutation.isPending ? "Отправка..." : "Отправить"}
              </Button>
            </DrawerFooter>
          </form>
        </Form>
      </DrawerContent>
    </Drawer>
  );

  // <Dialog open={isOpen} onOpenChange={setIsOpen}>
}
