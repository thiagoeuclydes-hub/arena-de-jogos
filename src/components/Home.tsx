import React from 'react';
import { GraduationCap, Gamepad2 } from 'lucide-react';

interface HomeProps {
  onGoProfessor: () => void;
  onGoAlunos: () => void;
}

export const Home: React.FC<HomeProps> = ({ onGoProfessor, onGoAlunos }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-12 my-auto py-12 px-4 w-full max-w-4xl mx-auto">
      
      <div className="space-y-3">
        <span className="px-4 py-1.5 rounded-full bg-[#07262c] border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-widest shadow-lg">
          Plataforma de Aula Gamificada
        </span>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow-md">
          ARENA DE <span className="text-amber-400">JOGOS</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl mt-4 items-center">
        
        {/* BOTÃO 1: ÁREA DO PROFESSOR */}
        <button
          onClick={onGoProfessor}
          className="group bg-[#07262c] hover:bg-[#0a353d] border-2 border-cyan-500/40 hover:border-amber-400 p-8 rounded-3xl shadow-xl transition transform hover:scale-105 flex flex-col items-center text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">ÁREA DO PROFESSOR</h3>
            <p className="text-xs text-cyan-300/70 mt-1">Gerenciamento de salas e cadeiras em tempo real</p>
          </div>
        </button>

        {/* BOTÃO 2: ARENA DE JOGOS (MUITO GRANDE E CENTRAL) */}
        <button
          onClick={onGoAlunos}
          className="group relative bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 p-10 rounded-3xl shadow-2xl border-2 border-yellow-200 transform transition hover:scale-105 flex flex-col items-center text-center space-y-4"
        >
          <div className="absolute -inset-1 bg-amber-400 rounded-3xl blur opacity-40 group-hover:opacity-100 transition"></div>
          <div className="relative w-20 h-20 rounded-2xl bg-slate-950 flex items-center justify-center text-amber-400 shadow-xl group-hover:scale-110 transition">
            <Gamepad2 className="w-10 h-10" />
          </div>
          <div className="relative">
            <h3 className="text-3xl font-black tracking-tight text-slate-950">ARENA DE JOGOS</h3>
            <p className="text-xs font-black uppercase tracking-widest text-slate-900 mt-1.5 opacity-90">
              Entrar na Sala &bull; Escolher Cadeira 🚀
            </p>
          </div>
        </button>

      </div>
    </div>
  );
};
