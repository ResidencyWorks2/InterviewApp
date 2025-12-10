"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/shared/utils";

export interface Toast {
	id: string;
	title?: string;
	description: string;
	variant?: "default" | "destructive" | "success";
	action?: {
		label: string;
		onClick: () => void;
	};
}

interface ToastContextValue {
	toasts: Toast[];
	toast: (toast: Omit<Toast, "id">) => string;
	dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(
	undefined,
);

export function useToast() {
	const context = React.useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within ToastProvider");
	}
	return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = React.useState<Toast[]>([]);

	const toast = React.useCallback((toastData: Omit<Toast, "id">) => {
		const id = Math.random().toString(36).slice(2, 11);
		const newToast: Toast = { ...toastData, id };
		setToasts((prev) => [...prev, newToast]);

		// Auto-dismiss after 5 seconds
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 5000);

		return id;
	}, []);

	const dismiss = React.useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	return (
		<ToastContext.Provider value={{ toasts, toast, dismiss }}>
			{children}
			<ToastContainer toasts={toasts} onDismiss={dismiss} />
		</ToastContext.Provider>
	);
}

function ToastContainer({
	toasts,
	onDismiss,
}: {
	toasts: Toast[];
	onDismiss: (id: string) => void;
}) {
	if (toasts.length === 0) {
		return null;
	}

	return (
		<div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-[420px]">
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
			))}
		</div>
	);
}

function ToastItem({
	toast,
	onDismiss,
}: {
	toast: Toast;
	onDismiss: (id: string) => void;
}) {
	return (
		<div
			className={cn(
				"group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all",
				toast.variant === "destructive" &&
					"border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200",
				toast.variant === "success" &&
					"border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200",
				!toast.variant && "border bg-background text-foreground",
			)}
		>
			<div className="grid gap-1 flex-1">
				{toast.title && (
					<div className="text-sm font-semibold">{toast.title}</div>
				)}
				<div className="text-sm opacity-90">{toast.description}</div>
				{toast.action && (
					<button
						type="button"
						onClick={() => {
							toast.action?.onClick();
							onDismiss(toast.id);
						}}
						className="mt-2 text-sm font-medium underline underline-offset-4 hover:no-underline"
					>
						{toast.action.label}
					</button>
				)}
			</div>
			<button
				type="button"
				onClick={() => onDismiss(toast.id)}
				className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
