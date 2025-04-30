import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { AlertTriangle, Loader } from "lucide-react";
import React from "react";

interface PopConfirmProps {
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending?: boolean;
  children: React.ReactNode;
}

export default function PopConfirm(
  {
    title,
    description,
    onConfirm,
    onCancel,
    children,
    isPending,
  }: PopConfirmProps = {
    title: "Are you sure?",
    description: "This action cannot be undone.",
    onConfirm: () => {},
    onCancel: () => {},
    children: null,
  },
) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <div onClick={() => setIsOpen(true)}>{children}</div>
      {isOpen && (
        <Card className="absolute right-0 z-50 w-72 p-4 shadow-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h4 className="font-semibold">{title}</h4>
          </div>
          <p className="mt-2 text-sm text-gray-500">{description}</p>
          <div className="mt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                onCancel();
              }}
            >
              Закрыть
            </Button>
            <Button
              variant="destructive"
              className="text-primary-foreground"
              size="sm"
              onClick={() => {
                onConfirm();
                setIsOpen(false);
              }}
              disabled={isPending}
            >
              Подтвердить
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
