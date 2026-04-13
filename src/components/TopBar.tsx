import { Bell, Menu, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getNotifications, markNotificationRead, type Notification } from "@/lib/store";
import { useState, useEffect } from "react";

interface TopBarProps {
  title: string;
  onMenuToggle: () => void;
}

export function TopBar({ title, onMenuToggle }: TopBarProps) {
  const { user } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    getNotifications().then((n) => {
      setNotifications(n.filter((nn) => nn.target_role === user?.role || nn.target_role === "all"));
    });
  }, [user?.role]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setShowNotifs(false);
  };

  return (
    <header className="bg-card border-b border-border px-4 md:px-6 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button className="md:hidden p-2 rounded-lg hover:bg-secondary" onClick={onMenuToggle}>
          <Menu className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold font-[family-name:var(--font-display)] text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center bg-input rounded-xl px-3 py-2 gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Rechercher..." className="bg-transparent text-sm outline-none w-32 text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="relative">
          <button className="relative p-2 rounded-lg hover:bg-secondary" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-bold">{unreadCount}</span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-12 w-72 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-border font-semibold text-sm">Notifications</div>
              <div className="max-h-60 overflow-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Aucune notification</p>
                ) : notifications.slice(0, 10).map((n) => (
                  <div key={n.id} className={`px-4 py-3 border-b border-border text-sm cursor-pointer hover:bg-secondary ${!n.read ? "bg-primary/5" : ""}`} onClick={() => handleMarkRead(n.id)}>
                    <p className="text-foreground">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
          {user?.display_name?.charAt(0) || "U"}
        </div>
      </div>
    </header>
  );
}
