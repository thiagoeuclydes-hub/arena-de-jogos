import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Room } from '../../types';
import { db, auth } from '../../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

const COLORS = [
  { id: 'purple', hex: '#A855F7' },
  { id: 'red', hex: '#EF4444' },
  { id: 'blue', hex: '#3B82F6' },
  { id: 'yellow', hex: '#EAB308' },
  { id: 'green', hex: '#22C55E' },
  { id: 'orange', hex: '#F97316' },
];

export default function ColorGame({ room }: { room: Room }) {
  const [disabled, setDisabled] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const handleTouch = async (colorId: string) => {
    if (disabled || room.gameState !== 'question_released') return;
    
    setDisabled(true);
    const isProhibited = colorId === room.forbiddenColor;

    if (isProhibited) {
      setFeedback('wrong');
      // No points or subtract? Let's say -5
      await updateDoc(doc(db, 'rooms', room.id, 'participants', auth.currentUser!.uid), {
        points: increment(-5),
        lastAnswer: colorId
      });
    } else {
      setFeedback('correct');
      // Gain 10 points
      await updateDoc(doc(db, 'rooms', room.id, 'participants', auth.currentUser!.uid), {
        points: increment(10),
        lastAnswer: colorId
      });
    }

    setTimeout(() => {
      setFeedback(null);
      setDisabled(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-['Lilita_One'] text-yellow-400">JOGO DAS CORES</h2>
        <p className="text-blue-100 font-bold">NÃO PODE APERTAR NA COR PROIBIDA!</p>
      </div>

      <div className="relative w-72 h-72">
        {/* The Wheel */}
        <div className="absolute inset-0 rounded-full border-8 border-slate-800 shadow-2xl overflow-hidden flex flex-wrap">
          {COLORS.map((color, idx) => (
            <button
              key={color.id}
              disabled={disabled || room.gameState !== 'question_released'}
              onClick={() => handleTouch(color.id)}
              className="w-1/2 h-1/3 transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>
        
        {/* Center */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-black rounded-full border-4 border-slate-800 shadow-lg" />
      </div>

      {feedback && (
        <motion.div 
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          className={`text-2xl font-bold py-2 px-6 rounded-full ${feedback === 'correct' ? 'bg-green-500' : 'bg-red-500'}`}
        >
          {feedback === 'correct' ? 'BOA! +10' : 'ERROU! -5'}
        </motion.div>
      )}

      {room.gameState === 'waiting' && (
        <p className="animate-pulse text-yellow-400 font-bold">Aguardando início da rodada...</p>
      )}
    </div>
  );
}
