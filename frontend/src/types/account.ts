export type AccountType = "bank" | "credit_card" | "cash" | "investment";

export interface Account {
  id: string;
  name: string;
  account_type: AccountType;
  institution: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
}
