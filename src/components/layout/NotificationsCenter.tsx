import { useState } from "react";
import { Bell, X, CheckCheck, AlertCircle, Info, TrendingUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Notification {
    id: string;
    type: "success" | "warning" | "info" | "alert";
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionLabel?: string;
    actionHref?: string;
}

const mockNotifications: Notification[] = [];
/*
    {
        id: "1",
        type: "success",
        title: "Payroll Completed",
        message: "Batch #204 processed successfully. 45 workers paid.",
        timestamp: "5m ago",
        read: false,
    },
    {
        id: "2",
        type: "warning",
        title: "KYC Verification Pending",
        message: "3 workers require KYC verification before next payroll.",
        timestamp: "1h ago",
        read: false,
        actionLabel: "Review",
        actionHref: "/dashboard/compliance",
    },
    {
        id: "3",
        type: "info",
        title: "Escrow Milestone Released",
        message: "Contract #ESC-1023 milestone 2 of 5 released.",
        timestamp: "3h ago",
        read: true,
    },
    {
        id: "4",
        type: "alert",
        title: "High Gas Fees",
        message: "Current gas price: 120 gwei. Consider delaying transactions.",
        timestamp: "5h ago",
        read: true,
    },
]; */

const notificationIcons = {
    success: CheckCheck,
    warning: AlertCircle,
    info: Info,
    alert: TrendingUp,
};

const notificationColors = {
    success: "text-emerald-500 bg-emerald-500/10",
    warning: "text-amber-500 bg-amber-500/10",
    info: "text-blue-500 bg-blue-500/10",
    alert: "text-red-500 bg-red-500/10",
};

export default function NotificationsCenter() {
    const [notifications, setNotifications] = useState(mockNotifications);
    const [isOpen, setIsOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d6cd] bg-[#fffdf8] text-[#77766e] transition-colors hover:border-[#b9d9cc] hover:text-[#20211e]" aria-label="Open notifications">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full"
                        />
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-[min(384px,calc(100vw-24px))] overflow-hidden rounded-2xl border-[#d9d6cd] bg-[#fffdf8] p-0 text-[#20211e] shadow-xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#e1dfd7] px-4 py-3.5">
                    <div>
                        <h3 className="font-semibold text-[#20211e]">Notifications</h3>
                        {unreadCount > 0 && (
                            <p className="text-xs text-[#77766e]">{unreadCount} unread</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={markAllAsRead}
                                className="h-7 text-xs text-[#575750]"
                            >
                                Mark all read
                            </Button>
                        )}
                        {notifications.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAll}
                                className="h-7 text-xs text-[#575750]"
                            >
                                Clear all
                            </Button>
                        )}
                    </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="py-12 text-center">
                            <span className="dashboard-icon mx-auto mb-3 h-10 w-10"><Bell className="h-4 w-4" /></span>
                            <p className="text-sm font-semibold text-[#20211e]">No notifications yet</p>
                            <p className="mt-1 text-xs text-[#77766e]">Connected alerts will appear here when an event needs your attention.</p>
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const Icon = notificationIcons[notification.type];
                            return (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "border-b border-[#e1dfd7] px-4 py-3 transition-colors last:border-0 hover:bg-[#f5f3ee]",
                                        !notification.read && "bg-[#e8eee4]"
                                    )}
                                >
                                    <div className="flex gap-3">
                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", notificationColors[notification.type])}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="text-sm font-medium text-[#20211e]">
                                                    {notification.title}
                                                </h4>
                                                {!notification.read && (
                                                    <button
                                                        onClick={() => markAsRead(notification.id)}
                                                        className="text-emerald-500 hover:text-emerald-400 text-xs"
                                                    >
                                                        Mark read
                                                    </button>
                                                )}
                                            </div>
                                            <p className="mb-2 text-xs text-[#575750]">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-[#77766e]">
                                                    {notification.timestamp}
                                                </span>
                                                {notification.actionLabel && (
                                                    <a
                                                        href={notification.actionHref}
                                                        className="text-xs text-emerald-500 hover:text-emerald-400 font-medium"
                                                    >
                                                        {notification.actionLabel} →
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
