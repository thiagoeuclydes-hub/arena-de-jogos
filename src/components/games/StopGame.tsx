import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Room } from '../../types';
import { db, auth } from '../../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { Timer, AlertTriangle } from 'lucide-react';

export default function StopGame({ room }: { room: Room }) {
  const [answers, setAnswers] = useState<Record<string, string>>({
    NOME: '',
    FES: '', // Flor, Estado, Sobrenome
    OBJETO: '',
    MSB: '', // Marca, Série, Banda
    FNA: '', // Filme, Novela, Ator
    PDC: '', // Profissão, Desenho, Cor
  });
  const [isStopped, setIsStopped] = useState(false);

  const categories = [
    { id: 'NOME', label: 'NOME' },
    { id: 'FES', label: 'F.E.S.' },
    { id: 'OBJETO', label: 'OBJETO' },
    { id: 'MSB', label: 'M.S.B.' },
    { id: 'FNA', label: 'F.N.A.' },
    { id: 'PDC', label: 'P.D.C.' },
  ];

  const handleStop = async () => {
    if (isStopped) return;
    setIsStopped(true);
    // Send answers to professor for validation
    await updateDoc(doc(db, 'rooms', room.id, 'participants', auth.currentUser!.uid), {
      lastAnswer: JSON.stringify(answers),
      points: increment(10) // Basic points for stopping first
    });
    
    // In a real app, we'd trigger a room-wide stop
    await updateDoc(doc(db, 'rooms', room.id), {
      gameState: 'answer_revealed'
    });
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-3xl font-['Lilita_One'] text-yellow-400">STOP / ADEDONHA</h2>

      <div className="w-full bg-slate-900/40 p-4 rounded-3xl border-4 border-red-500 shadow-2xl space-y-6">
        <div className="flex justify-between items-center bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-red-300">LETRA DO TURNO</span>
            <span className="text-4xl font-black text-red-500">{room.activeLetter || 'B'}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-red-300">TEMPO</span>
            <div className="flex items-center gap-2 text-2xl font-mono font-bold">
              <Timer size={20} /> 01:24
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {categories.map(cat => (
            <div key={cat.id} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 ml-2">{cat.label}</label>
              <input 
                type="text" 
                disabled={isStopped || room.gameState === 'answer_revealed'}
                value={answers[cat.id]}
                onChange={(e) => setAnswers({...answers, [cat.id]: e.target.value.toUpperCase()})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-bold focus:bg-white/10 focus:border-red-500 outline-none transition-all"
                placeholder="..."
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleStop}
          disabled={isStopped || room.gameState === 'answer_revealed'}
          className="w-full py-6 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 text-white font-black text-3xl rounded-2xl border-b-8 border-red-800 active:border-b-0 active:translate-y-2 transition-all shadow-xl"
        >
          {isStopped ? 'AGUARDANDO...' : 'STOP!'}
        </button>

        <div className="bg-red-950/30 p-4 rounded-xl border border-red-500/20 space-y-1">
          <h4 className="text-xs font-bold text-red-400 flex items-center gap-1"><AlertTriangle size={14} /> REGRAS</h4>
          <p className="text-[10px] text-red-200 opacity-60">
            1. Preencha todas as categorias com a letra do turno.<br />
            2. Aperte STOP para paralisar o jogo para todos.<br />
            3. Palavras únicas valem 10 pontos, repetidas valem 5.
          </p>
        </div>
      </div>
    </div>
  );
}
