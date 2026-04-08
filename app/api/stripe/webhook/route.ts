import { NextRequest, NextResponse } from "next/server";

// Stripe webhook placeholder — implement when Stripe is connected
export async function POST(_request: NextRequest) {
  // TODO: verify stripe-signature header, parse event, handle payment events
  return NextResponse.json({ received: true });
}
