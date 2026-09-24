export const supabase = {
  from: (name: string) => ({
    select: (_: string) => ({ eq: (_: string, __: string) => ({ name }) }),
  }),
};
export async function requireUser() {
  return { id: 'user-1' };
}
export async function requireOrganization(userId: string, organizationId: string) {
  if (!userId || !organizationId) throw new Error('forbidden');
}
