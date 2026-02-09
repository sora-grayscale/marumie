"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
        <h1 className="text-[20px] sm:text-[27px] font-bold">口座管理</h1>
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

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-pulse text-muted-foreground">読み込み中...</div>
        </div>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Landmark size={40} className="mb-4 opacity-30" />
            <p>口座が登録されていません</p>
            <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus size={16} className="mr-2" />
              口座を追加
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => {
            const Icon = accountTypeIcons[account.account_type] || Landmark;
            return (
              <Card key={account.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 p-3 rounded-xl bg-primary/10">
                      <Icon size={24} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {accountTypeLabels[account.account_type] || account.account_type}
                        {account.institution ? ` · ${account.institution}` : ""}
                      </p>
                      <p className="text-2xl font-bold text-foreground mt-3">
                        {formatCurrency(account.balance)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
