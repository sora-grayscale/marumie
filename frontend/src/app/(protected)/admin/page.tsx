"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { checkSession } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { User } from "@/types/user";
import { Plus, ShieldCheck, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const roleLabels: Record<string, string> = {
  owner: "オーナー",
  editor: "編集者",
  viewer: "閲覧者",
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("editor");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteMasterPassword, setInviteMasterPassword] = useState("");
  const [isInviting, setIsInviting] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get<User[]>("/api/admin/users");
      setUsers(data);
    } catch {
      // keep empty on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const session = await checkSession();
        setCurrentUserId(session.id);
      } catch {
        // ignore
      }
      await fetchUsers();
    };
    init();
  }, [fetchUsers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      await api.post("/api/auth/register", {
        email: inviteEmail,
        password: invitePassword,
        display_name: inviteDisplayName,
        master_password: inviteMasterPassword,
        role: inviteRole,
      });
      toast.success("ユーザーを招待しました");
      setInviteOpen(false);
      setInviteEmail("");
      setInviteDisplayName("");
      setInviteRole("editor");
      setInvitePassword("");
      setInviteMasterPassword("");
      await fetchUsers();
    } catch {
      toast.error("ユーザーの招待に失敗しました");
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/admin/users/${deletingUser.id}`);
      toast.success("ユーザーを削除しました");
      setDeleteDialogOpen(false);
      setDeletingUser(null);
      await fetchUsers();
    } catch {
      toast.error("ユーザーの削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] sm:text-[27px] font-bold flex items-center gap-2">
          <ShieldCheck size={24} />
          ユーザー管理
        </h1>
        <Button onClick={() => setInviteOpen(true)}>
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
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.display_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{roleLabels[user.role] || user.role}</TableCell>
                    <TableCell>
                      {user.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                        >
                          <Trash2 size={14} className="text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ユーザーを招待</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">メールアドレス</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">表示名</Label>
              <Input
                id="invite-name"
                type="text"
                value={inviteDisplayName}
                onChange={(e) => setInviteDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">権限</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">編集者</SelectItem>
                  <SelectItem value="viewer">閲覧者</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-password">初期パスワード</Label>
              <Input
                id="invite-password"
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-master">マスターパスワード</Label>
              <Input
                id="invite-master"
                type="password"
                value={inviteMasterPassword}
                onChange={(e) => setInviteMasterPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? "招待中..." : "招待"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-destructive" />
              ユーザーを削除
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>{deletingUser?.display_name}</strong>（{deletingUser?.email}）を削除しますか？この操作は取り消せません。
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
                {isDeleting ? "削除中..." : "削除"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
