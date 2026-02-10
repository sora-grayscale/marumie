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
    <header className="flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-sm px-8 py-3">
      <div />
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          aria-label="テーマ切替"
          className="rounded-xl h-9 w-9 p-0"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
        {userName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl px-3 py-1.5">
            <User size={15} />
            <span className="font-medium">{userName}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl text-muted-foreground hover:text-destructive">
          <LogOut size={16} className="mr-1.5" />
          ログアウト
        </Button>
      </div>
    </header>
  );
}
