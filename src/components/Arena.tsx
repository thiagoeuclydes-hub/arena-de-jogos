import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, LogOut, Gamepad2, Palette, HelpCircle, 
  CheckCircle2, XCircle, Type, Timer as TimerIcon 
} from 'lucide-react';
import { Room, Participant, GameType } from '../types';
import Scoreboard from './Scoreboard';

// Games
import ColorGame from './games/ColorGame';
import VFGame from './games/VFGame';
import QuizGame from './games/QuizGame';
import HangmanGame from './games/HangmanGame';
import StopGame from './games/StopGame';

interface ArenaProps {
  room: Room;
  participants: Participant[];
  onLogout: () => void;
}

export default function Arena({ room, participants, onLogout }: ArenaProps) {
  const [showScoreboard, setShowScoreboard] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-900 overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-yellow-400 p-2 rounded-lg text-black font-bold text-sm">
            {room.roomNumber}
          </div>
          <h1 className="text-xl font-['Lilita_One'] tracking-tight">ARENA DE JOGOS</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowScoreboard(!showScoreboard)}
            className="p-2 bg-yellow-400 text-black rounded-xl shadow-lg active:scale-95 transition-all"
          >
            <Trophy size={20} />
          </button>
          <button onClick={onLogout} className="p-2 bg-red-500 rounded-xl">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="p-4 flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
        <AnimatePresence mode="wait">
          {room.activeGame === 'none' ? (
            <motion.div 
              key="hub"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="relative flex flex-col items-center gap-8"
            >
              {/* Central Logo */}
              <div className="w-40 h-40 bg-yellow-400 flex items-center justify-center text-black font-['Lilita_One'] text-2xl text-center p-4 border-8 border-yellow-600 shadow-2xl z-10">
                ESPERANDO<br />O PROFESSOR
              </div>

              {/* Game Icons in Circle */}
              <div className="relative w-64 h-64">
                {gameButtons.map((g, idx) => {
                  const angle = (idx * 360) / gameButtons.length;
                  return (
                    <motion.div
                      key={g.id}
                      animate={{ 
                        x: Math.cos((angle * Math.PI) / 180) * 120,
                        y: Math.sin((angle * Math.PI) / 180) * 120
                      }}
                      className="absolute left-1/2 top-1/2 -ml-6 -mt-6"
                    >
                      <div className="w-12 h-12 bg-blue-500/50 rounded-full flex items-center justify-center border-2 border-white/20">
                        {g.icon}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="game"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-lg"
            >
              {room.activeGame === 'colors' && <ColorGame room={room} />}
              {room.activeGame === 'vf' && <VFGame room={room} />}
              {room.activeGame === 'quiz' && <QuizGame room={room} />}
              {room.activeGame === 'hangman' && <HangmanGame room={room} />}
              {room.activeGame === 'stop' && <StopGame room={room} />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Scoreboard Modal */}
      <AnimatePresence>
        {showScoreboard && (
          <Scoreboard 
            participants={participants} 
            onClose={() => setShowScoreboard(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const gameButtons = [
  { id: 'colors', icon: <Palette size={20} /> },
  { id: 'vf', icon: <CheckCircle2 size={20} /> },
  { id: 'quiz', icon: <HelpCircle size={20} /> },
  { id: 'hangman', icon: <Type size={20} /> },
  { id: 'stop', icon: <TimerIcon size={20} /> },
  { id: 'more', icon: <span className="font-bold">...</span> },
];
