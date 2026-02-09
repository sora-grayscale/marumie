ALTER TABLE accounts DROP CONSTRAINT accounts_account_type_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_account_type_check CHECK (account_type IN ('bank', 'credit_card', 'e_money', 'cash', 'investment'));
