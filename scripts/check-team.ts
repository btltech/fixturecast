#!/usr/bin/env ts-node

import { getTeamDetails } from '../services/footballApiService';

const teamName = process.argv[2] || 'Bolton Wanderers';

async function main() {
  const details = await getTeamDetails(teamName);
  console.log('Team details for', teamName, details);
}

main().catch(err => {
  console.error('Failed to fetch team details:', err);
  process.exit(1);
});

