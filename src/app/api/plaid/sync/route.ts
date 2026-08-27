import { NextResponse } from "next/server";
import { getCurrentUser, getOrCreateHousehold } from "@/lib/households";
import { syncAllPlaidItems, syncPlaidItemsForHousehold } from "@/lib/plaid-sync";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const results = await syncAllPlaidItems();

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync Plaid transactions." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const { user } = await getCurrentUser();
    const household = await getOrCreateHousehold(user);
    const results = await syncPlaidItemsForHousehold(household.id);

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync Plaid transactions." },
      { status: 500 }
    );
  }
}
