import { NextResponse } from "next/server";
export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (
      typeof data.name !== "string" ||
      data.name.trim().length < 2 ||
      data.name.length > 100 ||
      typeof data.email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(data.email) ||
      data.email.length > 254 ||
      typeof data.message !== "string" ||
      data.message.length > 3000
    ) {
      return NextResponse.json(
        { error: "Please check your name, email and message." },
        { status: 400 },
      );
    }
    return NextResponse.json({
      mode: "development",
      message:
        "Your enquiry passed validation. This demonstration does not send or store enquiries. Please connect a delivery service before launch.",
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to read your enquiry. Please try again." },
      { status: 400 },
    );
  }
}
