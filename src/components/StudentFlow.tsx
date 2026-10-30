import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Users, Key, LogIn, ChevronRight } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Room } from '../types';

interface StudentFlowProps {
  onBack: () => void;
  onEnter: (name: string, roomId: string, team?: string) => void;
}

export default function StudentFlow({ onBack, onEnter }: StudentFlowProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Name, 2: Mode, 3: Team, 4: Room/Pass
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'individual' | 'team'>('individual');
  const [team, setTeam] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'rooms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rList: Room[] = [];
      snapshot.forEach((doc) => rList.push({ id: doc.id, ...doc.data() } as Room));
      setRooms(rList);
    });
    return unsubscribe;
  }, []);

  const handleEnterRoom = async () => {
    setError('');
    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room) {
      setError('Sala não encontrada');
      return;
    }
    if (room.password !== password) {
      setError('Senha incorreta');
      return;
    }
    onEnter(name, selectedRoomId, mode === 'team' ? team : undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-400 to-blue-900 p-6 flex flex-col items-center justify-center">
      <header className="absolute top-6 left-6">
        <button onClick={onBack} className="p-2 bg-white/20 rounded-full">
          <ArrowLeft />
        </button>
      </header>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-sm space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-['Lilita_One']">+ COLOCAR NOME</h2>
              <p className="text-blue-100">Como você quer ser chamado?</p>
            </div>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome aqui..."
                className="w-full bg-white text-blue-900 rounded-2xl py-5 px-12 text-xl font-bold focus:outline-none focus:ring-4 ring-blue-300 transition-all"
              />
            </div>
            <button 
              disabled={!name}
              onClick={() => setStep(2)}
              className="w-full bg-yellow-400 disabled:opacity-50 text-black py-4 rounded-2xl font-bold text-xl border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-2"
            >
              PRÓXIMO <ChevronRight />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-sm space-y-6"
          >
            <h2 className="text-3xl font-['Lilita_One'] text-center">ESCOLHA O MODO</h2>
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => { setMode('individual'); setStep(4); }}
                className="bg-blue-500 py-6 rounded-2xl font-bold text-xl border-b-8 border-blue-700 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-3"
              >
                <User /> JOGAR INDIVIDUAL
              </button>
              <button 
                onClick={() => { setMode('team'); setStep(3); }}
                className="bg-cyan-500 py-6 rounded-2xl font-bold text-xl border-b-8 border-cyan-700 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-3"
              >
                <Users /> JOGAR EM EQUIPE
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-sm space-y-8"
          >
            <h2 className="text-3xl font-['Lilita_One'] text-center">EQUIPE</h2>
            <div className="space-y-4">
              <input 
                type="text" 
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                placeholder="Nome da equipe..."
                className="w-full bg-white text-blue-900 rounded-2xl py-5 px-6 text-xl font-bold focus:outline-none ring-blue-300 transition-all"
              />
              <button 
                disabled={!team}
                onClick={() => setStep(4)}
                className="w-full bg-yellow-400 disabled:opacity-50 text-black py-4 rounded-2xl font-bold text-xl border-b-8 border-yellow-600 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-2"
              >
                CRIAR EQUIPE
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            key="step4"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-sm space-y-6"
          >
            <h2 className="text-3xl font-['Lilita_One'] text-center">ENTRAR NA SALA</h2>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => setSelectedRoomId(`SALA_${num}`)}
                  className={`py-4 rounded-xl font-bold border-b-4 transition-all ${selectedRoomId === `SALA_${num}` ? 'bg-yellow-400 text-black border-yellow-600 scale-105' : 'bg-blue-600 text-white border-blue-800'}`}
                >
                  SALA {num}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400" />
              <input 
                type="text" 
                maxLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="SENHA (4 DÍGITOS)"
                className="w-full bg-white text-blue-900 rounded-2xl py-5 px-12 text-center text-2xl font-['Lilita_One'] tracking-widest focus:outline-none"
              />
            </div>

            {error && <p className="text-red-300 text-center font-bold">{error}</p>}

            <button 
              disabled={!selectedRoomId || password.length < 4}
              onClick={handleEnterRoom}
              className="w-full bg-green-400 disabled:opacity-50 text-black py-5 rounded-2xl font-bold text-2xl border-b-8 border-green-600 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center gap-3"
            >
              <LogIn /> ENTRAR NA ARENA
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
