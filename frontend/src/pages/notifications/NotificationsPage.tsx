import { Link } from "react-router-dom";
import { Bell, Sparkles, ClipboardList, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useNotificationStore } from "@/store/notificationStore";
import type { WsEvent } from "@/types";

export function NotificationsPage() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotificationStore();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
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
              event={n.event}
              read={n.read}
              timestamp={n.timestamp}
              onRead={() => markRead(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  event,
  read,
  timestamp,
  onRead,
}: {
  event: WsEvent;
  read: boolean;
  timestamp: string;
  onRead: () => void;
}) {
  const { icon, title, body, to } = renderEvent(event);

  return (
    <Link to={to} onClick={onRead}>
      <Card className={`hover:shadow-md transition-shadow ${!read ? "border-primary/30 bg-primary/5" : ""}`}>
        <CardContent className="p-4 flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${!read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{title}</p>
              {!read && <Badge variant="default" className="text-xs h-4 px-1.5">New</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(timestamp).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function renderEvent(event: WsEvent): {
  icon: React.ReactNode;
  title: string;
  body: string;
  to: string;
} {
  switch (event.type) {
    case "match":
      return {
        icon: <Sparkles className="h-4 w-4" />,
        title: "AI Match Found",
        body: `${event.match_count} potential match${event.match_count !== 1 ? "es" : ""} found for your ${event.item_type} item.`,
        to: `/items/${event.item_type}/${event.item_id}`,
      };
    case "claim_status":
      return {
        icon: <ClipboardList className="h-4 w-4" />,
        title: "Claim Status Updated",
        body: `Your claim #${event.claim_id} is now: ${event.status.replace(/_/g, " ")}.`,
        to: `/claims/${event.claim_id}`,
      };
    case "new_claim":
      return {
        icon: <ClipboardList className="h-4 w-4" />,
        title: "New Claim Received",
        body: `Claim #${event.claim_id} needs review at your venue.`,
        to: `/claims/${event.claim_id}`,
      };
  }
}
