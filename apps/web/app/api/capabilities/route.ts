import { NextResponse } from 'next/server';
import { localAnalysisCapability } from '../../../lib/local-analysis';

export async function GET() {
  return NextResponse.json(
    {
      localAnalysis: localAnalysisCapability(),
      showcase: true,
      dynamicVerification: false,
    },
    { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
  );
}
