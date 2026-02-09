"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Account } from "@/types/account";
import { Plus, Landmark, CreditCard, Banknote, TrendingUp } from "lucide-react";

const accountTypeIcons: Record<string, React.ElementType> = {
  bank: Landmark,
  credit_card: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
};

const accountTypeLabels: Record<string, string> = {
  bank: "銀行",
  credit_card: "クレジットカード",
  cash: "現金",
  investment: "投資",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [institution, setInstitution] = useState("");

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await api.get<Account[]>("/api/accounts");
      setAccounts(data);
    } catch {
      // keep empty on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const resetForm = () => {
    setName("");
    setAccountType("");
    setInstitution("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !accountType || !institution) return;

    setIsSubmitting(true);
    try {
      await api.post("/api/accounts", {
        name,
        account_type: accountType,
        institution,
      });
      setDialogOpen(false);
      resetForm();
      await fetchAccounts();
    } catch {
      // error handling can be added later
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">口座管理</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} className="mr-2" />
          口座を追加
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>口座を追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">口座名</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-type">種別</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="種別を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">銀行</SelectItem>
                  <SelectItem value="credit_card">クレジットカード</SelectItem>
                  <SelectItem value="cash">現金</SelectItem>
                  <SelectItem value="investment">投資</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-institution">金融機関</Label>
              <Input
                id="account-institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="楽天銀行, 三井住友銀行 等"
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !name || !accountType || !institution}
              >
                {isSubmitting ? "追加中..." : "追加"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>登録済み口座</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse text-muted-foreground">読み込み中...</div>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">口座が登録されていません</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>口座名</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>金融機関</TableHead>
                  <TableHead className="text-right">残高</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const Icon = accountTypeIcons[account.account_type] || Landmark;
                  return (
                    <TableRow key={account.id}>
                      <TableCell className="flex items-center gap-2">
                        <Icon size={16} className="text-muted-foreground" />
                        {account.name}
                      </TableCell>
                      <TableCell>{accountTypeLabels[account.account_type] || account.account_type}</TableCell>
                      <TableCell>{account.institution || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(account.balance)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
