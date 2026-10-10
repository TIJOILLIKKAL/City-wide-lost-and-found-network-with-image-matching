import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Package, ChevronRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { chatApi, type ChatRoomSummary } from "@/api/chat";
import { useNotificationStore } from "@/store/notificationStore";
import { useIsVenueStaff } from "@/store/authStore";
import { CLAIM_STATUS_LABELS, CLAIM_STATUS_VARIANT } from "@/lib/constants";
import { useEffect } from "react";

export function ChatListPage() {
  const qc = useQueryClient();
  const isStaff = useIsVenueStaff();
  const chatUnreads = useNotificationStore((s) => s.chatUnreads);

  const { data, isLoading } = useQuery({
    queryKey: ["chat-rooms"],
    queryFn: chatApi.listRooms,
    refetchInterval: 30000,
  });

  // Refetch instantly when any new chat message arrives via WS
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["chat-rooms"] });
  }, [chatUnreads, qc]);

  const rooms = data?.results ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {isStaff ? "Claim Chats" : "My Chats"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {isStaff
            ? `${data?.count ?? 0} conversation${(data?.count ?? 0) !== 1 ? "s" : ""} with claimants`
            : "Your conversations with venues about your claims"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg mb-1">No chats yet</h3>
          <p className="text-sm text-muted-foreground">
            Chats will appear here when claimants start conversations about their claims.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const unreads = chatUnreads[room.id] ?? [];
            return <RoomCard key={room.id} room={room} unreads={unreads} isStaff={!!isStaff} />;
          })}
        </div>
      )}
    </div>
  );
}

function RoomCard({
  room, unreads, isStaff,
}: {
  room: ChatRoomSummary;
  unreads: { senderName: string; text: string }[];
  isStaff: boolean;
}) {
  const navigate = useNavigate();
  const clearChatUnread = useNotificationStore((s) => s.clearChatUnread);
  const item = room.found_item;
  const hasNew = unreads.length > 0;

  const latestUnread = unreads[unreads.length - 1];
  const preview = latestUnread
    ? { text: latestUnread.text, sender_name: latestUnread.senderName }
    : room.last_message;

  // Staff sees claimant name; user sees venue name
  const counterpartLabel = isStaff ? room.claimant_name : room.venue_name;

  const handleClick = () => {
    clearChatUnread(room.id);
    navigate(`/chat/${room.claim_id}`);
  };

  return (
    <Card
      className={`hover:shadow-md transition-shadow cursor-pointer ${hasNew ? "border-primary/50 bg-primary/5" : ""}`}
      onClick={handleClick}
    >
      <CardContent className="p-4 flex gap-4 items-start">
        {/* Found item thumbnail */}
        <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted border">
          {item?.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
          {hasNew && (
            <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm ${hasNew ? "font-bold" : "font-semibold"}`}>
              {item?.title ?? `Found Item`}
            </span>
            <Badge variant={CLAIM_STATUS_VARIANT[room.claim_status] ?? "secondary"} className="text-xs">
              {CLAIM_STATUS_LABELS[room.claim_status] ?? room.claim_status}
            </Badge>
            {hasNew && (
              <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">
                {unreads.length} new
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Claim #{room.claim_id} · <span className="font-medium text-foreground">{counterpartLabel}</span>
          </p>

          {preview ? (
            <p className={`text-xs truncate ${hasNew ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              <span className="font-semibold">{preview.sender_name}:</span>{" "}
              {preview.text}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No messages yet — start the conversation</p>
          )}
        </div>

        {/* Right meta */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {room.last_message
              ? new Date(room.last_message.created_at).toLocaleDateString()
              : new Date(room.created_at).toLocaleDateString()}
          </div>
          {room.message_count > 0 && (
            <Badge variant="secondary" className="text-xs">{room.message_count} msg</Badge>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}
