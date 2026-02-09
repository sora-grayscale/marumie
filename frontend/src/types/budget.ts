export interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: string;
  spent: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetSummary {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
}
