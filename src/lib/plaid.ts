import { getPlaidEnv } from "@/lib/env";

type PlaidRequestBody = Record<string, unknown>;

export type PlaidAccount = {
  account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string | null;
  subtype: string | null;
};

export type PlaidTransaction = {
  account_id: string;
  transaction_id: string;
  name: string;
  merchant_name: string | null;
  amount: number;
  iso_currency_code: string | null;
  date: string;
  authorized_date: string | null;
  pending: boolean;
  personal_finance_category?: {
    primary: string;
    detailed: string;
  } | null;
};

export type PlaidSyncResponse = {
  accounts: PlaidAccount[];
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: { transaction_id: string }[];
  next_cursor: string;
  has_more: boolean;
};

const plaidHosts = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com"
};

export async function plaidRequest<T>(path: string, body: PlaidRequestBody) {
  const { clientId, secret, env } = getPlaidEnv();
  const response = await fetch(`${plaidHosts[env as keyof typeof plaidHosts]}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "PLAID-CLIENT-ID": clientId,
      "PLAID-SECRET": secret
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();

  if (!response.ok) {
    const message = typeof payload?.error_message === "string" ? payload.error_message : "Plaid request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export function mapPlaidCategory(transaction: PlaidTransaction) {
  const primary = transaction.personal_finance_category?.primary ?? "";
  const detailed = transaction.personal_finance_category?.detailed ?? "";
  const value = `${primary} ${detailed}`.toUpperCase();

  if (value.includes("GROCER")) {
    return "Groceries";
  }

  if (value.includes("RESTAURANT") || value.includes("FOOD_AND_DRINK")) {
    return "Dining out";
  }

  if (value.includes("UTILITY") || value.includes("TELEPHONE") || value.includes("INTERNET")) {
    return "Utilities";
  }

  if (value.includes("RENT") || value.includes("MORTGAGE")) {
    return "Mortgage/Rent";
  }

  if (value.includes("SUBSCRIPTION")) {
    return "Subscriptions";
  }

  if (value.includes("HOME_IMPROVEMENT") || value.includes("REPAIR") || value.includes("MAINTENANCE")) {
    return "Home improvement";
  }

  if (value.includes("TRANSPORT") || value.includes("GAS") || value.includes("PARKING")) {
    return "Transportation";
  }

  if (value.includes("MEDICAL") || value.includes("HEALTH")) {
    return "Health";
  }

  if (value.includes("ENTERTAINMENT")) {
    return "Entertainment";
  }

  if (value.includes("TRAVEL")) {
    return "Travel";
  }

  if (value.includes("INCOME") || transaction.amount < 0) {
    return "Income";
  }

  return "Miscellaneous";
}

export function plaidTransactionType(transaction: PlaidTransaction) {
  return transaction.amount < 0 ? "income" : "expense";
}

export function plaidTransactionAmount(transaction: PlaidTransaction) {
  return Math.abs(Number(transaction.amount));
}
