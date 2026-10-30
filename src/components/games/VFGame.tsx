import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Room, Theme, Question } from '../../types';
import { db, auth } from '../../firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { Check, X } from 'lucide-react';

export default function VFGame({ room }: { room: Room }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    if (room.activeThemeId) {
      getDoc(doc(db, 'themes', room.activeThemeId)).then(snap => {
        if (snap.exists()) {
          const t = { id: snap.id, ...snap.data() } as Theme;
          setTheme(t);
          // For simplicity, we use the first question or sync an index
          // In a real app, the professor chooses the question index
          setCurrentQuestion(t.questions[0]); 
        }
      });
    }
  }, [room.activeThemeId]);

  const handleAnswer = async (answer: string) => {
    if (answered || room.gameState !== 'question_released') return;
    setAnswered(true);

    const isCorrect = answer === currentQuestion?.correctAnswer;
    
    await updateDoc(doc(db, 'rooms', room.id, 'participants', auth.currentUser!.uid), {
      points: increment(isCorrect ? 15 : 0),
      lastAnswer: answer
    });

    if (isCorrect) setFeedback('correct');
    else setFeedback('wrong');
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-3xl font-['Lilita_One'] text-yellow-400">VERDADEIRO OU FALSO?</h2>
      
      <div className="w-full bg-indigo-900/50 backdrop-blur-md border-4 border-indigo-500 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {room.gameState === 'waiting' ? (
          <div className="text-center py-12">
            <p className="text-xl font-bold animate-pulse text-indigo-300">Aguardando pergunta...</p>
          </div>
        ) : (
          <div className="space-y-8">
            <h3 className="text-2xl font-bold text-center leading-tight">
              {currentQuestion?.text || 'Pergunta não carregada.'}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <button
                disabled={answered || room.gameState !== 'question_released'}
                onClick={() => handleAnswer('V')}
                className={`py-8 rounded-2xl flex flex-col items-center gap-2 border-b-8 transition-all ${answered ? 'opacity-50' : 'hover:scale-105 active:translate-y-2'} bg-green-500 border-green-700 text-white`}
              >
                <Check size={48} />
                <span className="font-bold text-xl">VERDADEIRO</span>
              </button>
              <button
                disabled={answered || room.gameState !== 'question_released'}
                onClick={() => handleAnswer('F')}
                className={`py-8 rounded-2xl flex flex-col items-center gap-2 border-b-8 transition-all ${answered ? 'opacity-50' : 'hover:scale-105 active:translate-y-2'} bg-red-500 border-red-700 text-white`}
              >
                <X size={48} />
                <span className="font-bold text-xl">FALSO</span>
              </button>
            </div>
          </div>
        )}

        {room.gameState === 'answer_revealed' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/80 z-10"
          >
            <div className="text-center space-y-4 p-6">
              <h4 className="text-3xl font-bold">RESPOSTA CORRETA:</h4>
              <div className={`text-6xl font-black ${currentQuestion?.correctAnswer === 'V' ? 'text-green-400' : 'text-red-400'}`}>
                {currentQuestion?.correctAnswer === 'V' ? 'VERDADEIRO' : 'FALSO'}
              </div>
              <p className="text-xl font-bold">
                {feedback === 'correct' ? 'VOCÊ ACERTOU! 🎉' : 'VOCÊ ERROU... 😢'}
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
