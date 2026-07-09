import { NextResponse } from "next/server";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import { plaidRequest } from "@/lib/plaid";
import { syncPlaidItem } from "@/lib/plaid-sync";
import { createAdminClient } from "@/lib/supabase/admin";

type ExchangeResponse = {
  access_token: string;
  item_id: string;
  request_id: string;
};

type ExchangeRequest = {
  public_token?: string;
  institution_name?: string | null;
};

type PlaidItemRow = {
  id: string;
  household_id: string;
  user_id: string;
  access_token: string;
  transactions_cursor: string | null;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ExchangeRequest;
  const publicToken = body.public_token;

  if (!publicToken) {
    return NextResponse.json({ error: "Missing public token." }, { status: 400 });
  }

  const { user } = await getCurrentUser();
  const household = await getOrCreateHousehold(user);
  const exchange = await plaidRequest<ExchangeResponse>("/item/public_token/exchange", {
    public_token: publicToken
  });

  const supabase = createAdminClient();
  const { data: item, error } = await supabase
    .from("plaid_items")
    .upsert(
      {
        household_id: household.id,
        user_id: user.id,
        item_id: exchange.item_id,
        access_token: exchange.access_token,
        institution_name: body.institution_name ?? null,
        status: "active",
        updated_at: new Date().toISOString()
      },
      { onConflict: "item_id" }
    )
    .select("id, household_id, user_id, access_token, transactions_cursor")
    .single<PlaidItemRow>();

  if (error) {
    throw new Error(error.message);
  }

  const syncResult = await syncPlaidItem(item);

  return NextResponse.json({ ok: true, sync: syncResult });
}
