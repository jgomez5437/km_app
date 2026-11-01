import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ user: null, isCloudConfigured: false });
  }

  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null, isCloudConfigured: true });
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name || session.email.split("@")[0],
    },
    isCloudConfigured: true,
  });
}
