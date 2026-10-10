import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send, Wifi, WifiOff, Package, MapPin, Tag, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { chatApi, type ChatMessage } from "@/api/chat";
import { itemsApi } from "@/api/items";
import { useUser, useIsVenueStaff } from "@/store/authStore";
import { useNotificationStore } from "@/store/notificationStore";
import { tokenStorage } from "@/api/client";
import { CLAIM_STATUS_LABELS, CLAIM_STATUS_VARIANT } from "@/lib/constants";

const WS_BASE = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;

export function ChatPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useNavigate();
  const me = useUser();
  const isStaff = useIsVenueStaff();

  const { data: room, isLoading } = useQuery({
    queryKey: ["chat-room", claimId],
    queryFn: () => chatApi.getOrCreateRoom(Number(claimId)),
    enabled: !!claimId,
  });

  const { data: foundItem } = useQuery({
    queryKey: ["found-item", room?.found_item_id],
    queryFn: () => itemsApi.getFoundItem(room!.found_item_id),
    enabled: !!room?.found_item_id,
  });

  const clearChatUnread = useNotificationStore((s) => s.clearChatUnread);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineIds, setOnlineIds] = useState<number[]>([]);
  const [input, setInput] = useState("");
  const [wsReady, setWsReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (room) {
      setMessages(room.messages);
      clearChatUnread(room.id);
    }
  }, [room, clearChatUnread]);

  const connect = useCallback((roomId: number) => {
    if (!mountedRef.current) return;
    const token = tokenStorage.getAccess();
    if (!token) return;
    const ws = new WebSocket(`${WS_BASE}/ws/chat/${roomId}/?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => setWsReady(true);
    ws.onclose = () => { if (mountedRef.current) setWsReady(false); };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "message") {
          setMessages((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, {
            id: data.id, sender_id: data.sender_id, sender_name: data.sender_name,
            text: data.text, created_at: data.created_at,
          }]);
        } else if (data.type === "presence") {
          setOnlineIds(data.online_ids ?? []);
        }
      } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    if (!room) return;
    mountedRef.current = true;
    connect(room.id);
    return () => {
      mountedRef.current = false;
      const ws = wsRef.current;
      if (!ws) return;
      ws.onmessage = null; ws.onerror = null; ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN) ws.close();
      else if (ws.readyState === WebSocket.CONNECTING) ws.onopen = () => ws.close();
      wsRef.current = null;
    };
  }, [room, connect]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !wsReady || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: "message", text }));
    setInput("");
  };

  if (isLoading) return <div className="max-w-2xl mx-auto h-[600px] rounded-lg bg-muted animate-pulse" />;
  if (!room) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Chat room not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go back</Button>
    </div>
  );

  const otherId = me?.id === room.claimant_id ? undefined : room.claimant_id;
  const isOtherOnline = otherId ? onlineIds.includes(otherId) : onlineIds.some((id) => id !== me?.id);
  const otherName = me?.id === room.claimant_id ? room.venue_name : room.claimant_name;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4" style={{ height: "calc(100vh - 7rem)" }}>

      {/* ── Claim + Found Item header ── */}
      <ClaimHeader room={room} foundItem={foundItem ?? null} isStaff={!!isStaff} />

      {/* ── Chat panel ── */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 pb-3 border-b shrink-0">
          <Button variant="ghost" size="icon" onClick={() => navigate(isStaff ? "/chat" : `/claims/${room.claim_id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{otherName}</span>
              <span className={`h-2 w-2 rounded-full ${isOtherOnline ? "bg-green-500" : "bg-gray-300"}`} />
              <span className="text-xs text-muted-foreground">{isOtherOnline ? "Online" : "Offline"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Claim #{room.claim_id} ·{" "}
              <Link to={`/claims/${room.claim_id}`} className="text-primary hover:underline">View claim</Link>
            </p>
          </div>
          <Badge variant={wsReady ? "default" : "secondary"} className="gap-1 shrink-0">
            {wsReady ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {wsReady ? "Live" : "Offline"}
          </Badge>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm pt-8">No messages yet. Start the conversation!</p>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} isMine={msg.sender_id === me?.id} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <Card className="p-3 mt-2 shrink-0">
          <div className="flex gap-2">
            <textarea
              className="flex-1 min-h-[40px] max-h-28 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Type a message… (Enter to send)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              rows={1}
            />
            <Button size="icon" onClick={sendMessage} disabled={!wsReady || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Claim + Found Item panel ────────────────────────────────────────────────

function ClaimHeader({ room, foundItem, isStaff }: {
  room: import("@/api/chat").ChatRoom;
  foundItem: import("@/types").FoundItem | null;
  isStaff: boolean;
}) {
  return (
    <Card className="shrink-0">
      <CardContent className="p-4 flex gap-4 items-start">
        {/* Image */}
        <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted border">
          {foundItem?.image_url ? (
            <img src={foundItem.image_url} alt={foundItem.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-7 w-7 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">
              {foundItem?.title ?? `Found Item (${room.found_item_id.slice(-6)})`}
            </span>
            <Badge variant={CLAIM_STATUS_VARIANT[room.claim_status] ?? "secondary"} className="text-xs">
              {CLAIM_STATUS_LABELS[room.claim_status] ?? room.claim_status}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            {foundItem?.category && (
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span className="capitalize">{foundItem.category}</span>
                {foundItem.color && <span>· {foundItem.color}</span>}
              </span>
            )}
            {foundItem?.found_location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {foundItem.found_location}
              </span>
            )}
            {foundItem?.found_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(foundItem.found_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {isStaff && (
            <div className="text-xs text-muted-foreground pt-0.5">
              <span className="font-medium text-foreground">{room.claimant_name}</span>
              {" · "}{room.claimant_email}
              {room.claimant_phone && ` · ${room.claimant_phone}`}
            </div>
          )}

          <Link to={`/items/found/${room.found_item_id}`} className="text-xs text-primary hover:underline">
            View full item →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, isMine }: { msg: ChatMessage; isMine: boolean }) {
  return (
    <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
        isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
      }`}>
        {!isMine && <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender_name}</p>}
        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 px-1">
        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
