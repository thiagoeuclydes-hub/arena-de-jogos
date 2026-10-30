import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Room, Theme, Question } from '../../types';
import { db, auth } from '../../firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';

export default function QuizGame({ room }: { room: Room }) {
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
          setCurrentQuestion(t.questions[0]); 
        }
      });
    }
  }, [room.activeThemeId]);

  const handleAnswer = async (option: string) => {
    if (answered || room.gameState !== 'question_released') return;
    setAnswered(true);

    const isCorrect = option === currentQuestion?.correctAnswer;
    
    await updateDoc(doc(db, 'rooms', room.id, 'participants', auth.currentUser!.uid), {
      points: increment(isCorrect ? 20 : 0),
      lastAnswer: option
    });

    if (isCorrect) setFeedback('correct');
    else setFeedback('wrong');
  };

  const optionColors = [
    'bg-blue-500 border-blue-700',
    'bg-green-500 border-green-700',
    'bg-orange-500 border-orange-700',
    'bg-purple-500 border-purple-700',
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-3xl font-['Lilita_One'] text-yellow-400">QUIZ DO DIA?</h2>
      
      <div className="w-full bg-purple-900/40 backdrop-blur-md border-4 border-purple-500 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        {room.gameState === 'waiting' ? (
          <div className="text-center py-12">
            <p className="text-xl font-bold animate-pulse text-purple-300">Aguardando início do Quiz...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-center leading-tight">
              {currentQuestion?.text || 'Pergunta não carregada.'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {currentQuestion?.options?.map((opt, idx) => (
                <button
                  key={idx}
                  disabled={answered || room.gameState !== 'question_released'}
                  onClick={() => handleAnswer(opt)}
                  className={`py-6 px-4 rounded-xl font-bold border-b-8 transition-all ${answered ? 'opacity-50' : 'hover:scale-105 active:translate-y-1'} ${optionColors[idx % 4]} text-white text-sm`}
                >
                  <div className="text-xs opacity-60 mb-1">OPÇÃO {String.fromCharCode(65 + idx)}</div>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {room.gameState === 'answer_revealed' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-black/90 z-20 p-6"
          >
            <div className="text-center space-y-4">
              <h4 className="text-2xl font-bold text-white/60">A RESPOSTA ERA:</h4>
              <div className="text-3xl font-black text-green-400 p-4 bg-green-400/10 rounded-2xl border-2 border-green-400">
                {currentQuestion?.correctAnswer}
              </div>
              <div className={`text-xl font-bold p-3 rounded-full ${feedback === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {feedback === 'correct' ? 'ACERTOU! +20' : 'ERROU...'}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
