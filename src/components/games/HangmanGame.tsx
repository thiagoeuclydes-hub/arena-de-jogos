import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Room, HangmanWord } from '../../types';
import { db, auth } from '../../firebase';
import { doc, updateDoc, increment, collection, getDocs, query, limit, getDoc } from 'firebase/firestore';
import { Heart, HelpCircle, Type } from 'lucide-react';

export default function HangmanGame({ room }: { room: Room }) {
  const [activeWord, setActiveWord] = useState<HangmanWord | null>(null);
  const [usedLetters, setUsedLetters] = useState<string[]>([]);
  const [errors, setErrors] = useState(0);
  const maxErrors = 6;

  useEffect(() => {
    const fetchWord = async () => {
      if (room.currentQuestionId) {
        const docRef = doc(db, 'hangmanWords', room.currentQuestionId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setActiveWord({ id: snap.id, ...snap.data() } as HangmanWord);
          setUsedLetters([]);
          setErrors(0);
          return;
        }
      }
      
      // Fallback
      setActiveWord({
        id: 'default',
        word: 'ARENA',
        category: 'GERAL',
        hint1: 'Lugar de batalha',
        hint2: 'Nome deste app',
        hintExtra: 'Palco central'
      });
    };
    fetchWord();
  }, [room.currentQuestionId]);


  const handleLetter = async (letter: string) => {
    if (usedLetters.includes(letter) || errors >= maxErrors) return;
    
    setUsedLetters([...usedLetters, letter]);
    
    if (!activeWord?.word.toUpperCase().includes(letter)) {
      setErrors(prev => prev + 1);
    } else {
      // Points per correct letter
      await updateDoc(doc(db, 'rooms', room.id, 'participants', auth.currentUser!.uid), {
        points: increment(5)
      });
    }
  };

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const displayedWord = activeWord?.word.split('').map(l => usedLetters.includes(l.toUpperCase()) ? l : '_').join(' ');

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-3xl font-['Lilita_One'] text-yellow-400">JOGO DA FORCA</h2>

      <div className="w-full bg-slate-900/60 p-6 rounded-3xl border-4 border-indigo-500 shadow-2xl space-y-6">
        {/* Gallows/Status */}
        <div className="flex justify-between items-start">
          <div className="w-32 h-32 border-4 border-indigo-400 border-l-8 border-b-8 rounded-bl-xl relative">
            {/* Draw person based on errors */}
            {errors > 0 && <div className="absolute top-2 right-2 w-6 h-6 border-2 border-white rounded-full" />} {/* Head */}
            {errors > 1 && <div className="absolute top-8 right-5 w-0.5 h-10 bg-white" />} {/* Body */}
            {errors > 2 && <div className="absolute top-10 right-5 w-8 h-0.5 bg-white -rotate-45 origin-left" />} {/* Arm L */}
            {errors > 3 && <div className="absolute top-10 right-5 w-8 h-0.5 bg-white rotate-45 origin-left" />} {/* Arm R */}
            {errors > 4 && <div className="absolute top-18 right-5 w-8 h-0.5 bg-white rotate-45 origin-left" />} {/* Leg L */}
            {errors > 5 && <div className="absolute top-18 right-5 w-8 h-0.5 bg-white -rotate-45 origin-left" />} {/* Leg R */}
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <Heart className="fill-current" /> ERROS: {errors} / {maxErrors}
            </div>
            <div className="bg-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold text-indigo-300">
              {activeWord?.category}
            </div>
          </div>
        </div>

        {/* Word Display */}
        <div className="text-4xl font-mono tracking-[0.2em] text-center font-black py-4 bg-white/5 rounded-2xl">
          {displayedWord}
        </div>

        {/* Keyboard */}
        <div className="grid grid-cols-7 gap-2">
          {alphabet.map(l => (
            <button
              key={l}
              disabled={usedLetters.includes(l) || errors >= maxErrors}
              onClick={() => handleLetter(l)}
              className={`py-3 rounded-lg font-bold text-sm transition-all ${usedLetters.includes(l) ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-400 text-white active:scale-90 shadow-[0_4px_0_0_rgba(49,46,129,1)] active:shadow-none active:translate-y-1'}`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Hints */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
          <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1"><HelpCircle size={14} /> DICAS</h4>
          <p className="text-sm">1. {activeWord?.hint1}</p>
          {errors > 2 && <p className="text-sm">2. {activeWord?.hint2}</p>}
          {errors > 4 && <p className="text-sm">3. {activeWord?.hintExtra}</p>}
        </div>
      </div>
    </div>
  );
}
