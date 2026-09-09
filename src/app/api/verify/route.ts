import { NextRequest, NextResponse } from "next/server";
const { verifyEvidenceBundle } = require("../../../../verifier/verifier_core");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const report = verifyEvidenceBundle(body);
    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "FAIL",
        timestamp: new Date().toISOString(),
        reasons: [`Invalid JSON payload or verification error: ${error.message}`],
        recomputed: null,
      },
      { status: 400 }
    );
  }
}
