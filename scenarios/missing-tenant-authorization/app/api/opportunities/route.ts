import { z } from 'zod';
import { requireUser, supabase } from '../../../lib/security';
const Input = z.object({ organizationId: z.string().uuid() });
export async function POST(request: Request) {
  await requireUser();
  const body = Input.parse(await request.json());
  return supabase.from('opportunities').select('*').eq('organization_id', body.organizationId);
}
