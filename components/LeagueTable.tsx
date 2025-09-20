import React from 'react';
import { League, LeagueTableRow } from '../types';
import TeamLogo from './TeamLogo';

interface LeagueTableProps {
  leagueName: League;
  tableData: LeagueTableRow[];
}

const LeagueTable: React.FC<LeagueTableProps> = ({ leagueName, tableData }) => {
  return (
    <div className="bg-gray-800/60 rounded-xl shadow-lg border border-gray-700 w-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold text-blue-400" id="league-table-title">{leagueName} - League Table</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300" aria-labelledby="league-table-title">
                <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                    <tr>
                        <th scope="col" className="px-4 py-3 text-center">#</th>
                        <th scope="col" className="px-6 py-3">Team</th>
                        <th scope="col" className="px-2 py-3 text-center" title="Played">P</th>
                        <th scope="col" className="px-2 py-3 text-center" title="Won">W</th>
                        <th scope="col" className="px-2 py-3 text-center" title="Drawn">D</th>
                        <th scope="col" className="px-2 py-3 text-center" title="Lost">L</th>
                        <th scope="col" className="px-2 py-3 text-center" title="Goal Difference">GD</th>
                        <th scope="col" className="px-4 py-3 text-center font-bold" title="Points">Pts</th>
                    </tr>
                </thead>
                <tbody>
                    {tableData.map((row) => (
                        <tr key={row.rank} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="px-4 py-2 text-center font-medium">{row.rank}</td>
                            <th scope="row" className="px-6 py-2 font-medium text-white whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                <TeamLogo teamName={row.teamName} size="small" showJerseyColors={true} />
                                <span>{row.teamName}</span>
                                </div>
                            </th>
                            <td className="px-2 py-2 text-center">{row.played}</td>
                            <td className="px-2 py-2 text-center text-green-400">{row.won}</td>
                            <td className="px-2 py-2 text-center text-yellow-400">{row.drawn}</td>
                            <td className="px-2 py-2 text-center text-red-400">{row.lost}</td>
                            <td className="px-2 py-2 text-center">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                            <td className="px-4 py-2 text-center font-bold text-white">{row.points}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default LeagueTable;
