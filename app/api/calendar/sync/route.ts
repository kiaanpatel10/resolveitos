import { NextResponse } from "next/server";

// Google Calendar OAuth sync — placeholder
// TODO: implement with google-auth-library once GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured
export async function POST() {
  return NextResponse.json(
    { error: "Google Calendar OAuth not yet configured. Use the .ics download instead." },
    { status: 501 }
  );
}
