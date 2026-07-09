import { createAdminClient } from "@/lib/supabase/admin";
import {
  mapPlaidCategory,
  plaidRequest,
  plaidTransactionAmount,
  plaidTransactionType,
  type PlaidAccount,
  type PlaidSyncResponse,
  type PlaidTransaction
} from "@/lib/plaid";

type PlaidItem = {
  id: string;
  household_id: string;
  user_id: string;
  access_token: string;
  transactions_cursor: string | null;
};

type ExistingTransaction = {
  plaid_transaction_id: string;
  category: string;
  category_source: string;
};

export async function syncPlaidItem(item: PlaidItem) {
  const supabase = createAdminClient();
  let cursor = item.transactions_cursor;
  let hasMore = true;
  let nextCursor = cursor;
  let added = 0;
  let modified = 0;
  let removed = 0;

  while (hasMore) {
    const payload = await plaidRequest<PlaidSyncResponse>("/transactions/sync", {
      access_token: item.access_token,
      cursor,
      count: 500,
      options: {
        include_original_description: true,
        days_requested: 730
      }
    });

    await upsertAccounts(item.id, payload.accounts);
    const addedCount = await upsertTransactions(item, payload.added);
    const modifiedCount = await upsertTransactions(item, payload.modified);
    const removedCount = await removeTransactions(payload.removed.map((transaction) => transaction.transaction_id));

    added += addedCount;
    modified += modifiedCount;
    removed += removedCount;
    nextCursor = payload.next_cursor;
    cursor = payload.next_cursor;
    hasMore = payload.has_more;
  }

  const { error } = await supabase
    .from("plaid_items")
    .update({
      transactions_cursor: nextCursor,
      last_synced_at: new Date().toISOString(),
      status: "active",
      updated_at: new Date().toISOString()
    })
    .eq("id", item.id);

  if (error) {
    throw new Error(error.message);
  }

  return { added, modified, removed };
}

export async function syncAllPlaidItems() {
  const supabase = createAdminClient();
  const { data: items, error } = await supabase
    .from("plaid_items")
    .select("id, household_id, user_id, access_token, transactions_cursor")
    .eq("status", "active")
    .returns<PlaidItem[]>();

  if (error) {
    throw new Error(error.message);
  }

  const results = [];

  for (const item of items ?? []) {
    results.push({ item_id: item.id, ...(await syncPlaidItem(item)) });
  }

  return results;
}

async function upsertAccounts(itemId: string, accounts: PlaidAccount[]) {
  if (accounts.length === 0) {
    return;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("plaid_accounts").upsert(
    accounts.map((account) => ({
      plaid_item_id: itemId,
      plaid_account_id: account.account_id,
      name: account.name,
      official_name: account.official_name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
      updated_at: new Date().toISOString()
    })),
    { onConflict: "plaid_account_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function upsertTransactions(item: PlaidItem, transactions: PlaidTransaction[]) {
  if (transactions.length === 0) {
    return 0;
  }

  const supabase = createAdminClient();
  const transactionIds = transactions.map((transaction) => transaction.transaction_id);
  const { data: existingRows, error: existingError } = await supabase
    .from("transactions")
    .select("plaid_transaction_id, category, category_source")
    .in("plaid_transaction_id", transactionIds)
    .returns<ExistingTransaction[]>();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingByPlaidId = new Map((existingRows ?? []).map((transaction) => [transaction.plaid_transaction_id, transaction]));

  const { error } = await supabase.from("transactions").upsert(
    transactions.map((transaction) => {
      const existing = existingByPlaidId.get(transaction.transaction_id);
      const keepManualCategory = existing?.category_source === "manual";

      return {
        household_id: item.household_id,
        user_id: item.user_id,
        source: "plaid",
        plaid_transaction_id: transaction.transaction_id,
        plaid_account_id: transaction.account_id,
        plaid_item_id: item.id,
        type: plaidTransactionType(transaction),
        amount: plaidTransactionAmount(transaction),
        category: keepManualCategory ? existing.category : mapPlaidCategory(transaction),
        category_source: keepManualCategory ? "manual" : "plaid",
        merchant: transaction.merchant_name,
        note: transaction.name,
        transaction_date: transaction.date,
        pending: transaction.pending,
        raw_plaid_transaction: transaction
      };
    }),
    { onConflict: "plaid_transaction_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return transactions.length;
}

async function removeTransactions(transactionIds: string[]) {
  if (transactionIds.length === 0) {
    return 0;
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("transactions").delete().in("plaid_transaction_id", transactionIds);

  if (error) {
    throw new Error(error.message);
  }

  return transactionIds.length;
}
