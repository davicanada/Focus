'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, Eye, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { formatDateTime } from '@/lib/utils';
import type { AlertNotification } from '@/types';

export function AlertNotifications() {
    const [notifications, setNotifications] = useState<AlertNotification[]>([]);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        setLoadingNotifications(true);
        try {
            const response = await fetch('/api/alert-notifications');
            if (response.ok) {
                const data = await response.json();
                setNotifications(data || []);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            toast.error('Erro ao carregar notificações');
        } finally {
            setLoadingNotifications(false);
        }
    };

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            const response = await fetch(`/api/alert-notifications/${notificationId}/read`, {
                method: 'PUT',
            });

            if (response.ok) {
                setNotifications(notifications.map(n =>
                    n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
                ));
                toast.success('Notificação marcada como lida');
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            toast.error('Erro ao marcar notificação');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const response = await fetch('/api/alert-notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_all_read' }),
            });

            if (response.ok) {
                setNotifications(notifications.map(n => ({
                    ...n,
                    is_read: true,
                    read_at: new Date().toISOString(),
                })));
                toast.success('Todas as notificações marcadas como lidas');
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
            toast.error('Erro ao marcar notificações');
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notificações Recentes
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Histórico de alertas gerados pelas regras de monitoramento
                    </p>
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Marcar todas lidas
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total de Alertas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{notifications.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Não Lidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Lidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {notifications.length - unreadCount}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Notifications List */}
            <Card>
                <CardHeader>
                    <CardTitle>Lista de Notificações</CardTitle>
                    <CardDescription>
                        {loadingNotifications
                            ? 'Carregando...'
                            : notifications.length === 0
                                ? 'Nenhuma notificação de alerta'
                                : `${notifications.length} notificação(ões)`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingNotifications ? (
                        <div className="flex justify-center py-8">
                            <Spinner size="lg" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhuma notificação de alerta ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${notification.is_read
                                        ? 'bg-muted/30 border-muted'
                                        : 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800'
                                        }`}
                                >
                                    <div className={`mt-1 ${notification.is_read ? 'text-muted-foreground' : 'text-orange-600'}`}>
                                        {notification.is_read ? (
                                            <Eye className="h-5 w-5" />
                                        ) : (
                                            <AlertTriangle className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-medium">{notification.rule_name}</p>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDateTime(notification.triggered_at)}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {notification.occurrence_count} ocorrência(s)
                                                    </Badge>
                                                </div>
                                            </div>
                                            {!notification.is_read && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
