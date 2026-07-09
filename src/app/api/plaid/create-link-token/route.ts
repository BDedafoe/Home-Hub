import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/households";
import { plaidRequest } from "@/lib/plaid";

type LinkTokenResponse = {
  link_token: string;
  expiration: string;
  request_id: string;
};

export async function POST() {
  const { user } = await getCurrentUser();
  const redirectUri = process.env.PLAID_REDIRECT_URI;
  const webhook = process.env.PLAID_WEBHOOK_URL;

  const payload = await plaidRequest<LinkTokenResponse>("/link/token/create", {
    client_name: "HomeHub",
    language: "en",
    country_codes: ["US"],
    products: ["transactions"],
    user: {
      client_user_id: user.id
    },
    ...(redirectUri ? { redirect_uri: redirectUri } : {}),
    ...(webhook ? { webhook } : {})
  });

  return NextResponse.json({ link_token: payload.link_token, expiration: payload.expiration });
}
