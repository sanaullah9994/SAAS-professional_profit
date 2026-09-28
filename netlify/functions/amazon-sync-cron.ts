import { runAllWorkspacesSync } from '@amazon-profit/sync';

export const config = { schedule: '@hourly' };

export default async function handler(): Promise<Response> {
  const results = await runAllWorkspacesSync({ trigger: 'scheduled' });
  return Response.json({
    workspaces: results.length,
    incomplete: results.some((result) => result.incomplete),
    accounts: results.flatMap((result) => result.accounts),
  });
}
