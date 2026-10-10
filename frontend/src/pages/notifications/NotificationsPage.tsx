import { Link } from "react-router-dom";
import { Bell, Sparkles, ClipboardList, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNotificationStore } from "@/store/notificationStore";
import { notificationsApi, type ApiNotification } from "@/api/notifications";

export function NotificationsPage() {
  const qc = useQueryClient();
  const clearUnread = useNotificationStore((s) => s.markAllRead);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markRead(),
    onSuccess: () => {
      clearUnread();
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unread = data?.unread_count ?? 0;
  const notifications = data?.results ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No notifications yet</h3>
          <p className="text-sm text-muted-foreground">
            You'll be notified here when AI finds matches or your claim status changes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationCard
              key={n.id}
              notification={n}
              onRead={() => {
                notificationsApi.markRead([n.id]);
                qc.invalidateQueries({ queryKey: ["notifications"] });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  notification: n,
  onRead,
}: {
  notification: ApiNotification;
  onRead: () => void;
}) {
  const { icon, to } = renderNotification(n);

  return (
    <Link to={to} onClick={!n.is_read ? onRead : undefined}>
      <Card className={`hover:shadow-md transition-shadow ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}>
        <CardContent className="p-4 flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${!n.is_read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{n.title}</p>
              {!n.is_read && <Badge variant="default" className="text-xs h-4 px-1.5">New</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(n.created_at).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function renderNotification(n: ApiNotification): { icon: React.ReactNode; to: string } {
  const lostId = (n.data.lost_item_id as string) || "";
  const foundId = (n.data.found_item_id as string) || "";

  switch (n.type) {
    case "match_found":
      return {
        icon: <Sparkles className="h-4 w-4" />,
        to: lostId ? `/items/lost/${lostId}` : "/items/found",
      };
    case "claim_update":
      return {
        icon: <ClipboardList className="h-4 w-4" />,
        to: `/claims/${(n.data.claim_id as string) || ""}`,
      };
    default:
      return { icon: <Bell className="h-4 w-4" />, to: "/notifications" };
  }
}
