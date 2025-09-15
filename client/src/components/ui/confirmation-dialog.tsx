import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, User, CreditCard, RotateCcw, Trash2 } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive" | "warning";
  icon?: React.ReactNode;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  icon,
}: ConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "destructive":
        return {
          icon: <Trash2 className="h-6 w-6 text-red-500" />,
          confirmButton: "bg-red-600 hover:bg-red-700 text-white",
          titleColor: "text-red-900",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
          confirmButton: "bg-yellow-600 hover:bg-yellow-700 text-white",
          titleColor: "text-yellow-900",
        };
      default:
        return {
          icon: <Shield className="h-6 w-6 text-blue-500" />,
          confirmButton: "bg-blue-600 hover:bg-blue-700 text-white",
          titleColor: "text-blue-900",
        };
    }
  };

  const styles = getVariantStyles();
  const displayIcon = icon || styles.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            {displayIcon}
          </div>
          <AlertDialogTitle className={`text-xl font-bold ${styles.titleColor}`}>
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base text-gray-600 mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-6">
          <AlertDialogCancel asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              {cancelText}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              onClick={handleConfirm}
              className={`w-full sm:w-auto ${styles.confirmButton}`}
            >
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Specialized confirmation dialogs for different actions
export function RoleChangeConfirmation({
  open,
  onOpenChange,
  onConfirm,
  userName,
  newRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName: string;
  newRole: string;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Change User Role"
      description={`Are you sure you want to change the role of ${userName} to ${newRole}?`}
      confirmText="Change Role"
      variant="warning"
      icon={<User className="h-6 w-6 text-yellow-500" />}
    />
  );
}

export function PlanChangeConfirmation({
  open,
  onOpenChange,
  onConfirm,
  userName,
  newPlan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName: string;
  newPlan: string;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Change User Plan"
      description={`Are you sure you want to change the plan of ${userName} to ${newPlan}?`}
      confirmText="Change Plan"
      variant="warning"
      icon={<CreditCard className="h-6 w-6 text-yellow-500" />}
    />
  );
}

export function UsageResetConfirmation({
  open,
  onOpenChange,
  onConfirm,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName: string;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Reset Usage Count"
      description={`Are you sure you want to reset the usage count of ${userName}?`}
      confirmText="Reset Usage"
      variant="warning"
      icon={<RotateCcw className="h-6 w-6 text-yellow-500" />}
    />
  );
}

export function DeleteUserConfirmation({
  open,
  onOpenChange,
  onConfirm,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  userName: string;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      title="Delete User"
      description={`Are you sure you want to delete ${userName}? This action cannot be undone.`}
      confirmText="Delete User"
      cancelText="Keep User"
      variant="destructive"
      icon={<Trash2 className="h-6 w-6 text-red-500" />}
    />
  );
}
