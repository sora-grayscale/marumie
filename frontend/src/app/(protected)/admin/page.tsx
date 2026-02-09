"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { User } from "@/types/user";
import { Plus, ShieldCheck } from "lucide-react";

const roleLabels: Record<string, string> = {
  owner: "オーナー",
  editor: "編集者",
  viewer: "閲覧者",
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.get<User[]>("/api/users");
        setUsers(data);
      } catch {
        // keep empty on error
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck size={24} />
          ユーザー管理
        </h1>
        <Button>
          <Plus size={16} className="mr-2" />
          ユーザーを招待
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>登録ユーザー</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse text-muted-foreground">読み込み中...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">ユーザーが登録されていません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メール</TableHead>
                  <TableHead>権限</TableHead>
                  <TableHead>パスキー</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{roleLabels[user.role] || user.role}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${user.has_passkey ? "bg-income/20 text-income" : "bg-muted text-muted-foreground"}`}>
                        {user.has_passkey ? "登録済" : "未登録"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
