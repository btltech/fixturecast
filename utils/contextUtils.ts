import { Match, PastPrediction, League, LeagueTableRow } from "../types";

const getResultLetter = (prediction: PastPrediction, teamName: string): 'W' | 'D' | 'L' => {
    const { homeTeam, actualResult } = prediction;
    const { homeScore, awayScore } = actualResult;

    if (homeScore === awayScore) return 'D';

    if (teamName === homeTeam) {
        return homeScore > awayScore ? 'W' : 'L';
    } else { // team is away team
        return awayScore > homeScore ? 'W' : 'L';
    }
};

export const buildContextForMatch = (
    match: Match, 
    allPastPredictions: PastPrediction[] | null,
    leagueTables: { [key in League]?: LeagueTableRow[] } | null,
    h2hData: any[] | null,
    homeTeamStats: any | null,
    awayTeamStats: any | null,
    homeTeamInjuries: any[] | null,
    awayTeamInjuries: any[] | null,
    formOverride?: { home?: string; away?: string }
) => {
    // Defensive programming: ensure all parameters are safe
    const safePastPredictions = allPastPredictions || [];
    const safeLeagueTables = leagueTables || {};
    const safeH2hData = h2hData || [];
    const safeHomeInjuries = homeTeamInjuries || [];
    const safeAwayInjuries = awayTeamInjuries || [];

    // 1. Get League Table Snippet
    let leagueTableSnippet = '';
    const table = safeLeagueTables[match.league];
    if (table && Array.isArray(table)) {
        const top = table.slice(0, 5);
        const bottom = table.slice(-3);
        const relevantTeams = table.filter(t => t.teamName === match.homeTeam || t.teamName === match.awayTeam);
        
        let snippet = `Top 5: ${top.map(t => `${t.rank}. ${t.teamName} (${t.points}pts)`).join(', ')}. `;
        // Ensure we don't duplicate teams if they are in the top/bottom
        relevantTeams.forEach(t => {
            if (!top.find(x => x.teamName === t.teamName) && !bottom.find(x => x.teamName === t.teamName)) {
                snippet += `${t.rank}. ${t.teamName} (${t.points}pts). `;
            }
        });
        snippet += `Bottom 3: ${bottom.map(t => `${t.rank}. ${t.teamName} (${t.points}pts)`).join(', ')}.`;
        leagueTableSnippet = snippet;
    }

    // 2. Get Team Form Snippets
    const getTeamForm = (teamName: string): string => {
        if (!safePastPredictions || safePastPredictions.length === 0) {
            return 'No recent matches found';
        }
        
        const teamMatches = safePastPredictions
            .filter(p => p.homeTeam === teamName || p.awayTeam === teamName)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
        
        if (teamMatches.length === 0) return 'No recent matches found';
        
        return teamMatches.map(p => getResultLetter(p, teamName)).join(', ');
    };

    const homeTeamFormSnippet = formOverride?.home || getTeamForm(match.homeTeam);
    const awayTeamFormSnippet = formOverride?.away || getTeamForm(match.awayTeam);

    // 3. Get Head-to-Head (H2H) Snippet + BTTS historic
    let headToHeadSnippet = 'No H2H data available.';
    let bttsHistoricSnippet = '';
    if (safeH2hData && safeH2hData.length > 0) {
        let homeWins = 0;
        let awayWins = 0;
        let draws = 0;
        let bothTeamsScored = 0;
        safeH2hData.forEach(fixture => {
            const homeGoals = fixture.goals?.home ?? 0;
            const awayGoals = fixture.goals?.away ?? 0;
            if (homeGoals > 0 && awayGoals > 0) bothTeamsScored++;
            if (fixture.teams.home.winner) {
                if (fixture.teams.home.id === match.homeTeamId) homeWins++;
                else awayWins++;
            } else if (fixture.teams.away.winner) {
                if (fixture.teams.away.id === match.awayTeamId) awayWins++;
                else homeWins++;
            } else {
                draws++;
            }
        });
        headToHeadSnippet = `Last ${safeH2hData.length} meetings: ${match.homeTeam} ${homeWins} wins, ${match.awayTeam} ${awayWins} wins, ${draws} draws.`;
        bttsHistoricSnippet = `BTTS occurred in ${bothTeamsScored} of last ${safeH2hData.length} meetings (${Math.round((bothTeamsScored / safeH2hData.length) * 100)}%).`;
    }

    // 4. Get Team Stats Snippets
    const formatStats = (stats: any, teamName: string): string => {
        if (!stats || !stats.goals) return `No detailed stats for ${teamName}.`;
        const form = stats.form || 'N/A';
        const goalsFor = stats.goals.for.total.total || 0;
        const goalsAgainst = stats.goals.against.total.total || 0;
        return `Form: ${form}. Goals Scored: ${goalsFor}, Conceded: ${goalsAgainst}.`;
    };
    const homeTeamStatsSnippet = formatStats(homeTeamStats, match.homeTeam);
    const awayTeamStatsSnippet = formatStats(awayTeamStats, match.awayTeam);

    // 5. Get Injuries Snippets
    const formatInjuries = (injuries: any[], teamName: string): string => {
        if (!injuries || injuries.length === 0) return `No reported injuries for ${teamName}.`;
        return `Out: ${injuries.map(i => i.player?.name || 'Unknown').join(', ')}.`;
    };
    const homeTeamInjuriesSnippet = formatInjuries(safeHomeInjuries, match.homeTeam);
    const awayTeamInjuriesSnippet = formatInjuries(safeAwayInjuries, match.awayTeam);

    return {
        leagueTableSnippet,
        homeTeamFormSnippet,
        awayTeamFormSnippet,
        headToHeadSnippet,
        bttsHistoricSnippet,
        homeTeamStatsSnippet,
        awayTeamStatsSnippet,
        homeTeamInjuriesSnippet,
        awayTeamInjuriesSnippet,
    };
};
