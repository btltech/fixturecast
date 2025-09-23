#!/usr/bin/env ts-node

import { getTeamsByLeague } from '../services/footballApiService';
import { League } from '../types';

const leagueArg = process.argv[2];

const normalise = (input: string) => input.replace(/[^a-z0-9]/gi, '').toLowerCase();

async function main() {
  if (!leagueArg) {
    console.error('Usage: ts-node scripts/fetch-league-data.ts <LeagueNameOrEnum>');
    process.exit(1);
  }

  const normInput = normalise(leagueArg);
  const leagueFromKey = Object.keys(League).find(key => normalise(key) === normInput);
  const leagueFromValue = Object.values(League).find(value => normalise(value) === normInput);
  const league = leagueFromKey ? (League as any)[leagueFromKey] : leagueFromValue;

  if (!league) {
    console.error(`Unknown league: ${leagueArg}`);
    process.exit(1);
  }

  console.log(`Fetching teams for league: ${league}`);
  const teams = await getTeamsByLeague(league as League);
  console.log(JSON.stringify(teams, null, 2));
}

main().catch(err => {
  console.error('Failed to fetch league data:', err);
  process.exit(1);
});
