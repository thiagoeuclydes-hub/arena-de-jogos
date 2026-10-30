import React from 'react';
import { motion } from 'framer-motion';
import { X, Trophy, Users, User } from 'lucide-react';
import { Participant } from '../types';

interface ScoreboardProps {
  participants: Participant[];
  onClose: () => void;
}

export default function Scoreboard({ participants, onClose }: ScoreboardProps) {
  // Aggregate by team if needed
  const teams = Array.from(new Set(participants.map(p => p.team).filter(Boolean)));
  const isTeamMode = teams.length > 0;

  const teamScores = teams.map(teamName => {
    const members = participants.filter(p => p.team === teamName);
    const totalPoints = members.reduce((sum, p) => sum + p.points, 0);
    return { name: teamName, points: totalPoints, members: members.length };
  }).sort((a, b) => b.points - a.points);

  const individualScores = [...participants].sort((a, b) => b.points - a.points);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border-4 border-yellow-400 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="bg-yellow-400 p-4 flex items-center justify-between">
          <h2 className="text-black font-['Lilita_One'] text-2xl flex items-center gap-2">
            <Trophy className="fill-black" /> PLACAR
          </h2>
          <button onClick={onClose} className="p-1 bg-black/10 rounded-full text-black hover:bg-black/20">
            <X />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {isTeamMode ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={14} /> MODO EQUIPE
              </h3>
              {teamScores.map((t, idx) => (
                <div key={t.name} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-['Lilita_One'] text-yellow-400">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-lg">{t.name}</div>
                      <div className="text-xs text-white/40">{t.members} membros</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-400">{t.points} PTS</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <User size={14} /> MODO INDIVIDUAL
              </h3>
              {individualScores.map((p, idx) => (
                <div key={p.uid} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-['Lilita_One'] text-yellow-400">#{idx + 1}</span>
                    <div className="font-bold text-lg">{p.name}</div>
                  </div>
                  <div className="text-2xl font-bold text-green-400">{p.points} PTS</div>
                </div>
              ))}
            </div>
          )}
          
          {participants.length === 0 && (
            <div className="text-center py-12 text-white/40 italic">
              Ninguém pontuou ainda...
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
