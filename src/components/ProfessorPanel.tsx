import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Plus, Users, Gamepad2, Database, Upload, 
  Trash2, Copy, RefreshCw, Key, LogOut, Check, X, 
  Settings as SettingsIcon, Play, Eye
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, query, onSnapshot, setDoc, doc, 
  updateDoc, deleteDoc, getDocs, addDoc, orderBy 
} from 'firebase/firestore';
import { Room, GameType, Theme, Question, Participant, HangmanWord } from '../types';
import * as XLSX from 'xlsx';

interface ProfessorPanelProps {
  onBack: () => void;
  onRoomSelect: (room: Room) => void;
}

export default function ProfessorPanel({ onBack, onRoomSelect }: ProfessorPanelProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState<'rooms' | 'content' | 'control'>('rooms');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [themes, setThemes] = useState<Theme[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'rooms'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rList: Room[] = [];
      snapshot.forEach((doc) => rList.push({ id: doc.id, ...doc.data() } as Room));
      setRooms(rList);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'themes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tList: Theme[] = [];
      snapshot.forEach((doc) => tList.push({ id: doc.id, ...doc.data() } as Theme));
      setThemes(tList);
    });
    return unsubscribe;
  }, []);

  const createRoom = async (number: number) => {
    try {
      const id = `SALA_${number}`;
      const password = Math.floor(1000 + Math.random() * 9000).toString();
      const newRoom: Room = {
        id,
        roomNumber: `SALA ${number}`,
        password,
        activeGame: 'none',
        gameState: 'waiting',
        lastUpdate: new Date().toISOString(),
      };
      await setDoc(doc(db, 'rooms', id), newRoom);
    } catch (error) {
      console.error("Erro ao criar sala:", error);
      alert("Erro ao criar sala. Verifique se você está logado.");
    }
  };

  const deleteRoom = async (id: string) => {
    await deleteDoc(doc(db, 'rooms', id));
    if (selectedRoom?.id === id) setSelectedRoom(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'vf' | 'quiz') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const questions: Question[] = data.map((row: any, idx: number) => ({
        id: idx.toString(),
        text: row.PERGUNTA || row.pergunta,
        options: type === 'quiz' ? [row.A, row.B, row.C, row.D] : undefined,
        correctAnswer: row.CORRETA || row.correta || (row.V ? 'V' : 'F'),
      }));

      const themeName = prompt('Qual o nome do TEMA para este banco de questões?');
      if (themeName) {
        await addDoc(collection(db, 'themes'), {
          name: themeName,
          type,
          questions
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-400 to-green-800 p-4 pb-20">
      <header className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="p-2 bg-white/20 rounded-full">
          <ArrowLeft />
        </button>
        <h2 className="text-2xl font-bold font-['Lilita_One']">PAINEL DO PROFESSOR</h2>
        <div className="w-10"></div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('rooms')}
          className={`flex-1 py-3 rounded-xl font-bold transition-all ${activeTab === 'rooms' ? 'bg-yellow-400 text-black shadow-lg' : 'bg-green-700 text-white/60'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Users size={20} /> SALAS
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('content')}
          className={`flex-1 py-3 rounded-xl font-bold transition-all ${activeTab === 'content' ? 'bg-yellow-400 text-black shadow-lg' : 'bg-green-700 text-white/60'}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Database size={20} /> CONTEÚDO
          </div>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'rooms' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(num => {
              const room = rooms.find(r => r.roomNumber === `SALA ${num}`);
              return (
                <div key={num} className="relative">
                  {room ? (
                    <button 
                      onClick={() => { setSelectedRoom(room); setActiveTab('control'); }}
                      className="w-full bg-blue-500 p-4 rounded-2xl border-b-8 border-blue-700 text-left"
                    >
                      <h3 className="font-bold text-lg">{room.roomNumber}</h3>
                      <div className="flex items-center gap-1 text-sm text-blue-100">
                        <Key size={14} /> {room.password}
                      </div>
                      <div className="mt-2 text-xs bg-blue-600 inline-block px-2 py-1 rounded-full">
                        {room.activeGame === 'none' ? 'Aguardando' : room.activeGame.toUpperCase()}
                      </div>
                    </button>
                  ) : (
                    <button 
                      onClick={() => createRoom(num)}
                      className="w-full h-32 bg-green-900/30 border-4 border-dashed border-green-300/30 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-green-900/50 transition-all"
                    >
                      <Plus className="text-green-300" />
                      <span className="text-green-300 font-bold">CRIAR SALA {num}</span>
                    </button>
                  )}
                  {room && (
                    <button 
                      onClick={() => deleteRoom(room.id)}
                      className="absolute top-2 right-2 p-1 text-red-300 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white/10 p-4 rounded-2xl space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Upload size={18} /> IMPORTAR QUESTÕES</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-2">
                  <span className="text-sm">Verdadeiro ou Falso (.xlsx)</span>
                  <input 
                    type="file" 
                    accept=".xlsx" 
                    onChange={(e) => handleFileUpload(e, 'vf')}
                    className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-black hover:file:bg-yellow-300"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-sm">Quiz (.xlsx)</span>
                  <input 
                    type="file" 
                    accept=".xlsx" 
                    onChange={(e) => handleFileUpload(e, 'quiz')}
                    className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-400 file:text-black hover:file:bg-yellow-300"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold flex items-center gap-2"><Gamepad2 size={18} /> TEMAS DISPONÍVEIS</h3>
              {themes.map(theme => (
                <div key={theme.id} className="bg-green-900/40 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-bold">{theme.name}</div>
                    <div className="text-xs text-green-300">{theme.type === 'vf' ? 'Verdadeiro ou Falso' : 'Quiz'} · {theme.questions.length} questões</div>
                  </div>
                  <button onClick={() => deleteDoc(doc(db, 'themes', theme.id))} className="text-red-400"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'control' && selectedRoom && (
          <RoomControl 
            room={selectedRoom} 
            themes={themes}
            onClose={() => setActiveTab('rooms')} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function RoomControl({ room, themes, onClose }: { room: Room, themes: Theme[], onClose: () => void }) {
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [hangmanWords, setHangmanWords] = useState<HangmanWord[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'rooms', room.id, 'participants'), orderBy('points', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pList: Participant[] = [];
      snapshot.forEach((doc) => pList.push(doc.data() as Participant));
      setParticipants(pList);
    });
    return unsubscribe;
  }, [room.id]);

  useEffect(() => {
    const q = query(collection(db, 'hangmanWords'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wList: HangmanWord[] = [];
      snapshot.forEach((doc) => wList.push({ id: doc.id, ...doc.data() } as HangmanWord));
      setHangmanWords(wList);
    });
    return unsubscribe;
  }, []);

  const updateRoomGame = async (game: GameType) => {
    const updates: any = {
      activeGame: game,
      gameState: 'waiting',
      activeThemeId: selectedTheme || null,
      lastUpdate: new Date().toISOString()
    };
    
    // Default values for games
    if (game === 'colors') updates.forbiddenColor = 'red';
    if (game === 'stop') updates.activeLetter = 'A';
    
    await updateDoc(doc(db, 'rooms', room.id), updates);
  };

  const updateSetting = async (field: string, value: any) => {
    await updateDoc(doc(db, 'rooms', room.id), { [field]: value });
  };

  const randomizeLetter = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const random = letters[Math.floor(Math.random() * letters.length)];
    updateSetting('activeLetter', random);
  };

  const randomizeColor = () => {
    const colors = ['purple', 'red', 'blue', 'yellow', 'green', 'orange'];
    const random = colors[Math.floor(Math.random() * colors.length)];
    updateSetting('forbiddenColor', random);
  };

  const releaseQuestion = async () => {
    await updateDoc(doc(db, 'rooms', room.id), {
      gameState: 'question_released',
      lastUpdate: new Date().toISOString()
    });
  };

  const revealAnswer = async () => {
    await updateDoc(doc(db, 'rooms', room.id), {
      gameState: 'answer_revealed',
      lastUpdate: new Date().toISOString()
    });
  };

  const games: { id: GameType, label: string, color: string }[] = [
    { id: 'colors', label: 'JOGO DAS CORES', color: 'bg-blue-500' },
    { id: 'vf', label: 'VERDADEIRO OU FALSO', color: 'bg-blue-500' },
    { id: 'quiz', label: 'QUIZ', color: 'bg-blue-500' },
    { id: 'hangman', label: 'JOGO DA FORCA', color: 'bg-blue-500' },
    { id: 'stop', label: 'STOP / ADEDONHA', color: 'bg-blue-500' },
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">{room.roomNumber} - CONTROLE</h3>
        <button onClick={onClose} className="text-white/60"><X /></button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Game Selection */}
        <div className="grid grid-cols-2 gap-2">
          {games.map(g => (
            <button
              key={g.id}
              onClick={() => updateRoomGame(g.id)}
              className={`py-3 px-2 rounded-xl font-bold border-b-4 text-[10px] ${room.activeGame === g.id ? 'bg-yellow-400 text-black border-yellow-600' : g.color + ' border-blue-700'}`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Specific Game Settings */}
        <div className="bg-green-900/40 p-4 rounded-2xl space-y-4">
          <h4 className="text-xs font-bold uppercase text-green-300">Configurações do Jogo</h4>
          
          {(room.activeGame === 'vf' || room.activeGame === 'quiz') && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold">TEMA DAS PERGUNTAS</label>
              <select 
                value={selectedTheme} 
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full bg-green-900 border border-green-600 rounded-lg p-2 text-xs"
              >
                <option value="">Selecione um tema...</option>
                {themes.filter(t => t.type === room.activeGame).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {room.activeGame === 'colors' && (
            <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl">
              <div className="space-y-1">
                <span className="text-[10px] font-bold">COR PROIBIDA</span>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: room.forbiddenColor }} />
                  <span className="text-xs uppercase font-bold">{room.forbiddenColor}</span>
                </div>
              </div>
              <button onClick={randomizeColor} className="bg-blue-500 p-2 rounded-lg"><RefreshCw size={16} /></button>
            </div>
          )}

          {room.activeGame === 'stop' && (
            <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl">
              <div className="space-y-1">
                <span className="text-[10px] font-bold">LETRA ATIVA</span>
                <div className="text-2xl font-black text-yellow-400">{room.activeLetter}</div>
              </div>
              <button onClick={randomizeLetter} className="bg-blue-500 p-2 rounded-lg"><RefreshCw size={16} /></button>
            </div>
          )}

          {room.activeGame === 'hangman' && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase">Palavra da Forca</label>
              <select 
                value={room.currentQuestionId || ''} 
                onChange={(e) => updateSetting('currentQuestionId', e.target.value)}
                className="w-full bg-green-900 border border-green-600 rounded-lg p-2 text-xs"
              >
                <option value="">Selecione uma palavra...</option>
                {hangmanWords.map(w => (
                  <option key={w.id} value={w.id}>{w.word} ({w.category})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {room.activeGame !== 'none' && (
        <div className="bg-white/10 p-4 rounded-2xl space-y-4">
          <h4 className="font-bold text-center border-b border-white/20 pb-2 text-sm">FLUXO DA RODADA</h4>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={releaseQuestion}
              className={`py-3 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${room.gameState === 'question_released' ? 'bg-blue-600 text-white shadow-inner scale-95' : 'bg-blue-400 text-black shadow-lg'}`}
            >
              <Play size={20} />
              <span className="text-[10px]">LIBERAR</span>
            </button>
            <button 
              onClick={revealAnswer}
              className={`py-3 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${room.gameState === 'answer_revealed' ? 'bg-orange-600 text-white scale-95' : 'bg-orange-500 text-white'}`}
            >
              <Eye size={20} />
              <span className="text-[10px]">REVELAR</span>
            </button>
          </div>
        </div>
      )}

      {/* Real-time Answers */}
      <div className="bg-green-950/40 p-4 rounded-2xl space-y-3">
        <h4 className="text-xs font-bold uppercase text-green-300 flex items-center justify-between">
          <span>Participantes ({participants.length})</span>
          <Users size={14} />
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {participants.map(p => (
            <div key={p.uid} className="flex items-center justify-between bg-white/5 p-2 rounded-lg text-xs">
              <div className="flex flex-col">
                <span className="font-bold">{p.name} {p.team ? `(${p.team})` : ''}</span>
                <span className="text-[10px] text-green-400">{p.points} PTS</span>
              </div>
              <div className="text-right">
                {p.lastAnswer ? (
                  <span className="bg-blue-500/20 px-2 py-0.5 rounded text-[10px] text-blue-300 max-w-[80px] truncate block">
                    {p.lastAnswer.length > 15 ? 'Enviado' : p.lastAnswer}
                  </span>
                ) : (
                  <span className="text-white/20 italic text-[10px]">PENSANDO...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => updateRoomGame('none')}
          className="flex-1 bg-red-500/20 text-red-300 py-3 rounded-xl border border-red-500/50 font-bold text-xs"
        >
          ENCERRAR JOGO
        </button>
        <button
          onClick={seedData}
          className="bg-white/10 text-white/40 px-4 py-3 rounded-xl border border-white/10 text-[10px]"
        >
          DADOS TESTE
        </button>
      </div>
    </motion.div>
  );
}

async function seedData() {
  const themesRef = collection(db, 'themes');
  const hangmanRef = collection(db, 'hangmanWords');

  // Seed Quiz
  await addDoc(themesRef, {
    name: 'CIÊNCIAS GERAIS',
    type: 'quiz',
    questions: [
      { id: '1', text: 'Qual planeta é conhecido como o Planeta Vermelho?', options: ['Terra', 'Marte', 'Júpiter', 'Saturno'], correctAnswer: 'Marte' },
      { id: '2', text: 'Qual a unidade básica da vida?', options: ['Átomo', 'Célula', 'Molécula', 'Proteína'], correctAnswer: 'Célula' }
    ]
  });

  // Seed VF
  await addDoc(themesRef, {
    name: 'GEOGRAFIA',
    type: 'vf',
    questions: [
      { id: '1', text: 'O Brasil é o maior país da América do Sul?', correctAnswer: 'V' },
      { id: '2', text: 'A capital da Austrália é Sydney?', correctAnswer: 'F' }
    ]
  });

  // Seed Hangman
  await addDoc(hangmanRef, {
    word: 'ALGORITMO',
    category: 'TECNOLOGIA',
    hint1: 'Sequência de passos',
    hint2: 'Base da programação',
    hintExtra: 'Palavra de origem árabe'
  });

  alert('Dados de teste gerados com sucesso!');
}

