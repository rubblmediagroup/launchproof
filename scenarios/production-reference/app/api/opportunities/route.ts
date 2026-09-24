import { z } from 'zod';
import { requireUser, requireOrganization, supabase } from '../../../lib/security';
const Input = z.object({ organizationId: z.string().uuid() });
export async function POST(request: Request) {
  const user = await requireUser();
  const body = Input.parse(await request.json());
  await requireOrganization(user.id, body.organizationId);
  return supabase.from('opportunities').select('*').eq('organization_id', body.organizationId);
}
