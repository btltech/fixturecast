#!/usr/bin/env ts-node

import { getTodaysFixtures, getAllUpcomingFixtures } from '../services/footballApiService.ts';
import { League } from '../types.ts';

const [,, leagueArg] = process.argv;

const normalize = (input: string) => input?.replace(/[^a-z0-9]/gi, '').toLowerCase();

async function main() {
  const timeRun = new Date().toISOString();
  console.log(`Running fixture check at ${timeRun}`);

  if (leagueArg) {
    const norm = normalize(leagueArg);
    const leagueKey = Object.keys(League).find(key => normalize(key) === norm);
    const leagueValue = Object.values(League).find(value => normalize(value) === norm);
    const league = leagueKey ? (League as any)[leagueKey] : leagueValue;

    if (!league) {
      console.error(`Unknown league: ${leagueArg}`);
      process.exit(1);
    }

    const todays = await getTodaysFixtures(league as League);
    console.log(`Found ${todays.length} fixtures today for ${league}:`);
    console.log(todays.slice(0, 5));
  }

  const upcoming = await getAllUpcomingFixtures();
  console.log(`Total upcoming fixtures fetched: ${upcoming.length}`);
  if (upcoming.length > 0) {
    console.log('Sample fixture:', upcoming[0]);
  }
}

main().catch(err => {
  console.error('Fixture check failed:', err);
  process.exit(1);
});
