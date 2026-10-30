import React from 'react';
import { motion } from 'framer-motion';
import { Play, Settings } from 'lucide-react';

interface HomeProps {
  onProfessor: () => void;
  onStudent: () => void;
}

export default function Home({ onProfessor, onStudent }: HomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 p-4">
      {/* Logo */}
      <motion.div 
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        className="relative mb-12"
      >
        <div className="w-64 h-64 bg-yellow-400 transform -skew-x-12 flex items-center justify-center border-8 border-yellow-600 shadow-[10px_10px_0px_0px_rgba(180,120,0,1)]">
          <h1 className="text-4xl font-['Lilita_One'] text-black text-center leading-tight">
            ARENA DE<br />JOGOS
          </h1>
        </div>
        {/* Glow effect */}
        <div className="absolute inset-0 bg-yellow-400 blur-3xl opacity-20 -z-10 animate-pulse"></div>
      </motion.div>

      <div className="flex flex-col gap-6 w-full max-w-xs">
        <button
          onClick={onStudent}
          className="group relative bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 px-8 rounded-2xl border-b-8 border-blue-700 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-3 text-xl"
        >
          <Play className="fill-current" />
          ENTRA NO JOGO
        </button>

        <button
          onClick={onProfessor}
          className="group relative bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 px-8 rounded-2xl border-b-8 border-yellow-700 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-3 text-xl"
        >
          <Settings />
          PAINEL DO PROFESSOR
        </button>
      </div>
      
      <p className="mt-12 text-blue-300 text-sm opacity-60">© 2026 Arena de Jogos - Educativo</p>
    </div>
  );
}
