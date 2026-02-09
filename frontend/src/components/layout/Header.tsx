"use client";

import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { LogOut, User, Sun, Moon } from "lucide-react";

interface HeaderProps {
  userName?: string;
}

export default function Header({ userName }: HeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
      <div />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="テーマ切替">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        {userName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User size={16} />
            <span>{userName}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut size={16} className="mr-2" />
          ログアウト
        </Button>
      </div>
    </header>
  );
}
