import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, Play, Plus, Trash2, Sparkles, ArrowLeft, CheckCircle2, 
  XCircle, Volume2, VolumeX, Gamepad2, Flame, ChevronRight, 
  LogOut, FileSpreadsheet, Download, Upload, RefreshCw, GraduationCap, User, UsersRound, Armchair, Edit3, DoorOpen, Lock, Key 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let db: any = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (e) {
  console.warn("Firebase init skipped or failed, using local storage:", e);
}

// Sound effects generator using Web Audio API
class SoundFX {
  ctx: AudioContext | null = null;
  muted: boolean = false;

  constructor() {}

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    osc.frequency.setValueAtTime(880, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playIncorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(130.81, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

const soundFX = new SoundFX();

// Preset thematic question packs
const THEME_PRESETS: Record<string, any[]> = {
  "Filme Os Vingadores": [
    { question: "Qual é o nome do martelo do Thor?", options: ["Stormbreaker", "Mjolnir", "Vibranium", "Excalibur"], correctIndex: 1 },
    { question: "Qual joia do infinito estava na manopla do Thanos em Ultimato?", options: ["Joia da Alma", "Joia do Tempo", "Todas as Joias", "Apenas a Joia do Espaço"], correctIndex: 2 },
    { question: "Qual herói se sacrifica no final de Vingadores: Ultimato?", options: ["Capitão América", "Thor", "Homem de Ferro", "Hulk"], correctIndex: 2 },
    { question: "Qual o nome da inteligência artificial do Tony Stark?", options: ["JARVIS", "FRIDAY", "EDITH", "Todas as anteriores"], correctIndex: 3 }
  ],
  "Geografia": [
    { question: "Qual é o maior país do mundo em território?", options: ["Canadá", "China", "Rússia", "Estados Unidos"], correctIndex: 2 },
    { question: "Em qual continente fica o Deserto do Saara?", options: ["Ásia", "África", "Oceania", "América do Sul"], correctIndex: 1 },
    { question: "Qual é a capital da Austrália?", options: ["Sydney", "Melbourne", "Camberra", "Brisbane"], correctIndex: 2 },
    { question: "Qual o rio mais extenso do mundo?", options: ["Rio Nilo", "Rio Amazonas", "Rio Mississippi", "Rio Yangtzé"], correctIndex: 1 }
  ],
  "Ciências": [
    { question: "Qual é a unidade básica da vida?", options: ["Átomo", "Molécula", "Célula", "Órgão"], correctIndex: 2 },
    { question: "Qual gás as plantas absorvem na fotossíntese?", options: ["Oxigênio", "Gás Carbônico", "Nitrogênio", "Hidrogênio"], correctIndex: 1 },
    { question: "Qual o planeta mais próximo do Sol?", options: ["Vênus", "Mercúrio", "Terra", "Marte"], correctIndex: 1 },
    { question: "Qual a fórmula química da água?", options: ["H2O", "CO2", "NaCl", "O2"], correctIndex: 0 }
  ]
};

const DEFAULT_ROOMS = [
  { id: 'room_1', code: '1234', title: 'Sala de Cadeiras 1', subject: 'Geografia', gameType: 'quiz', status: 'waiting', currentQuestionIndex: -1, questions: THEME_PRESETS["Geografia"], players: [], chairs: Array(60).fill(null), createdAt: Date.now() },
  { id: 'room_2', code: '5678', title: 'Sala de Cadeiras 2', subject: 'Ciências', gameType: 'quiz', status: 'waiting', currentQuestionIndex: -1, questions: THEME_PRESETS["Ciências"], players: [], chairs: Array(60).fill(null), createdAt: Date.now() }
];

export default function App() {
  const [view, setView] = useState<'home' | 'teacher_login' | 'teacher_dashboard' | 'create_room' | 'student_room_list' | 'student_enter_room_pin' | 'student_chair_selection' | 'student_game_hub' | 'student_active_game' | 'teacher_live_control'>('home');
  
  const [rooms, setRooms] = useState<any[]>(() => {
    try {
      const local = localStorage.getItem('arenadejogos_rooms');
      if (local) return JSON.parse(local);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_ROOMS;
  });

  const [activeRoom, setActiveRoom] = useState<any>(DEFAULT_ROOMS[0]);
  const [roomPinInput, setRoomPinInput] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [muted, setMuted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Teacher Login States
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Form states for creating/editing room
  const [roomTitle, setRoomTitle] = useState('');
  const [customPin, setCustomPin] = useState('1234');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState('Geografia');
  const [gameType, setGameType] = useState<'quiz' | 'verdadeiro_falso' | 'forca'>('quiz');
  
  // Student join & chair selection states
  const [studentName, setStudentName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦁');
  const [selectedChair, setSelectedChair] = useState<number | null>(null);

  // Active game in Arena
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<boolean | null>(null);

  // Fetch rooms from cloud and localStorage
  const fetchRoomsFromCloud = async () => {
    setIsSyncing(true);
    let combinedRooms = [...rooms];
    try {
      const local = localStorage.getItem('arenadejogos_rooms');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          combinedRooms = parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'rooms'));
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const existingIdx = combinedRooms.findIndex(r => r.id === docSnap.id || r.code === data.code);
          const formattedRoom = {
            ...data,
            id: docSnap.id,
            chairs: data.chairs || Array(60).fill(null),
            players: data.players || [],
            questions: data.questions || THEME_PRESETS["Geografia"]
          };
          if (existingIdx >= 0) {
            combinedRooms[existingIdx] = formattedRoom;
          } else {
            combinedRooms.push(formattedRoom);
          }
        });
      } catch (e) {
        console.warn("Cloud fetch warning:", e);
      }
    }

    if (combinedRooms.length === 0) {
      combinedRooms = DEFAULT_ROOMS;
    }

    setRooms(combinedRooms);
    try {
      localStorage.setItem('arenadejogos_rooms', JSON.stringify(combinedRooms));
    } catch (e) {
      console.error(e);
    }
    setIsSyncing(false);
    return combinedRooms;
  };

  useEffect(() => {
    fetchRoomsFromCloud();
    let unsubscribe: any = null;
    if (db) {
      try {
        unsubscribe = onSnapshot(collection(db, 'rooms'), (snapshot: any) => {
          const loadedRooms: any[] = [];
          snapshot.forEach((docSnap: any) => {
            const data = docSnap.data();
            loadedRooms.push({
              ...data,
              id: docSnap.id,
              chairs: data.chairs || Array(60).fill(null),
              players: data.players || [],
              questions: data.questions || THEME_PRESETS["Geografia"]
            });
          });
          if (loadedRooms.length > 0) {
            setRooms(loadedRooms);
            localStorage.setItem('arenadejogos_rooms', JSON.stringify(loadedRooms));
            if (activeRoom) {
              const updatedActive = loadedRooms.find(r => r.id === activeRoom.id || r.code === activeRoom.code);
              if (updatedActive) setActiveRoom(updatedActive);
            }
          }
        }, (err: any) => {
          console.warn("Snapshot warning:", err.message);
        });
      } catch (e) {
        console.warn("Snapshot setup error:", e);
      }
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const saveRoomToCloudAndLocal = async (room: any) => {
    const updated = rooms.map(r => r.id === room.id ? room : r);
    if (!updated.some(r => r.id === room.id)) {
      updated.unshift(room);
    }
    setRooms(updated);
    try {
      localStorage.setItem('arenadejogos_rooms', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'rooms', room.id), room, { merge: true });
      } catch (e) {
        console.warn("Cloud save warning:", e);
      }
    }
  };

  const deleteRoomFromCloudAndLocal = async (roomId: string, roomCode: string) => {
    const updated = rooms.filter(r => r.id !== roomId && r.code !== roomCode);
    setRooms(updated.length > 0 ? updated : DEFAULT_ROOMS);
    try {
      localStorage.setItem('arenadejogos_rooms', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (db) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId));
      } catch (e) {
        console.warn("Cloud delete warning:", e);
      }
    }
  };

  const toggleSound = () => {
    soundFX.muted = !muted;
    setMuted(!muted);
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.playClick();
    if (usernameInput.trim() === 'arenadejogos' && passwordInput.trim() === '100529') {
      setView('teacher_dashboard');
      setUsernameInput('');
      setPasswordInput('');
      fetchRoomsFromCloud();
    } else {
      alert('Usuário ou senha do professor incorretos. Use arenadejogos / 100529');
    }
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    setRoomTitle(`Sala de Cadeiras - ${theme}`);
    soundFX.playClick();
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle) {
      alert('Preencha o nome da sala de cadeiras.');
      return;
    }
    soundFX.playClick();

    if (editingRoomId) {
      const room = rooms.find((r: any) => r.id === editingRoomId);
      if (room) {
        room.title = roomTitle;
        if (customPin.trim()) {
          room.code = customPin.trim();
        }
        saveRoomToCloudAndLocal(room);
      }
      setEditingRoomId(null);
      setView('teacher_dashboard');
    } else {
      const code = customPin.trim() || '1234';
      const newRoom = {
        id: 'room_' + Date.now(),
        code,
        title: roomTitle,
        subject: selectedTheme,
        gameType,
        status: 'waiting',
        currentQuestionIndex: -1,
        questions: THEME_PRESETS[selectedTheme] || THEME_PRESETS["Geografia"],
        players: [],
        chairs: Array(60).fill(null),
        createdAt: Date.now()
      };
      saveRoomToCloudAndLocal(newRoom);
      setActiveRoom(newRoom);
      setView('teacher_live_control');
    }
  };

  const handleStartEditRoom = (room: any) => {
    soundFX.playClick();
    setEditingRoomId(room.id);
    setRoomTitle(room.title);
    setCustomPin(room.code);
    setSelectedTheme(room.subject || 'Geografia');
    setView('create_room');
  };

  const handleVerifyRoomPin = (room: any) => {
    soundFX.playClick();
    setActiveRoom(room);
    setView('student_enter_room_pin');
  };

  const handleUnlockRoom = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.playClick();
    if (roomPinInput.trim() === String(activeRoom.code)) {
      setView('student_chair_selection');
      setRoomPinInput('');
    } else {
      alert('Senha (PIN) incorreta. A senha padrão para teste é 1234 (ou a definida pelo professor).');
    }
  };

  const handleSelectChairAndEnter = async (chairIdx: number) => {
    if (!studentName.trim()) {
      alert('Digite seu nome antes de escolher a cadeira.');
      return;
    }

    soundFX.playClick();
    await fetchRoomsFromCloud();
    const currentRoom = rooms.find(r => r.id === activeRoom.id) || activeRoom;

    if (!currentRoom.chairs) currentRoom.chairs = Array(60).fill(null);
    if (currentRoom.chairs[chairIdx] !== null) {
      alert('Esta cadeira já está ocupada por outro aluno. Escolha outra.');
      return;
    }

    const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    const newPlayer = {
      id: playerId,
      name: studentName,
      avatar: selectedAvatar,
      score: 0,
      chairIndex: chairIdx
    };

    currentRoom.chairs[chairIdx] = newPlayer;
    if (!currentRoom.players) currentRoom.players = [];
    currentRoom.players.push(newPlayer);

    await saveRoomToCloudAndLocal(currentRoom);
    setActiveRoom(currentRoom);
    setSelectedChair(chairIdx);
    setStudent(newPlayer);
    setView('student_game_hub');
  };

  const avatars = ['🦁', '🚀', '🦊', '⚡', '👑', '🦄', '🦖', '🎸', '🤖', '🐱'];

  return (
    <div className="min-h-screen bg-[#031317] bg-grid-pattern text-white font-sans selection:bg-amber-400 selection:text-slate-950 flex flex-col relative overflow-x-hidden">
      
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between z-50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setView('home'); setActiveRoom(DEFAULT_ROOMS[0]); setStudent(null); }}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Gamepad2 className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-amber-400">
              ARENA DE JOGOS
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={() => { fetchRoomsFromCloud(); soundFX.playClick(); alert('Salas de cadeiras sincronizadas!'); }}
            className="p-2.5 rounded-2xl bg-[#07262c] border border-cyan-500/30 hover:bg-[#0a353d] transition text-cyan-300 shadow-md flex items-center space-x-1"
            title="Sincronizar Salas"
          >
            <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold hidden md:inline">Sincronizar</span>
          </button>

          <button 
            onClick={toggleSound}
            className="p-2.5 rounded-2xl bg-[#07262c] border border-cyan-500/30 hover:bg-[#0a353d] transition text-cyan-300 shadow-md"
            title="Ativar/Desativar Som"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={() => { setView('teacher_login'); soundFX.playClick(); }}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition transform hover:scale-105 flex items-center space-x-2"
          >
            <GraduationCap className="w-5 h-5" />
            <span>PAINEL DO PROFESSOR</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full z-10">

        {/* 1. HOME SCREEN */}
        {view === 'home' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-16">
            <div className="inline-flex items-center space-x-2 px-6 py-2 rounded-full bg-[#07262c] border border-cyan-500/40 text-cyan-300 text-xs md:text-sm font-bold mb-8 shadow-lg">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>SALA DE AULA GAMIFICADA EM TEMPO REAL</span>
            </div>

            <div className="relative group cursor-pointer mb-10" onClick={() => { setView('student_room_list'); soundFX.playClick(); }}>
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 px-12 py-8 rounded-3xl shadow-2xl border-2 border-yellow-200 transform transition group-hover:scale-105">
                <h2 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-sm">
                  ARENA DE JOGOS
                </h2>
                <p className="text-xs md:text-sm font-extrabold uppercase tracking-widest text-slate-900 mt-1 opacity-90">
                  Plataforma Educativa
                </p>
              </div>
            </div>

            <p className="text-cyan-200/80 text-base md:text-lg max-w-xl mb-10 font-medium">
              Clique em Entrar para ver a lista de salas de cadeiras criadas pelo professor, digite a senha (PIN), escolha sua cadeira e vá para a Arena de Jogos!
            </p>

            <button
              onClick={() => { setView('student_room_list'); soundFX.playClick(); }}
              className="px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-lg shadow-xl shadow-cyan-500/30 transition transform hover:scale-105 flex items-center space-x-2"
            >
              <DoorOpen className="w-5 h-5" />
              <span>ENTRAR (LISTA DE CADEIRAS) 🚀</span>
            </button>
          </div>
        )}

        {/* 1.1 STUDENT ROOM LIST (ABA ALUNOS - LISTA DE CADEIRAS/SALAS) */}
        {view === 'student_room_list' && (
          <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full py-8 space-y-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => { setView('home'); soundFX.playClick(); }}
                className="p-2.5 rounded-xl bg-[#07262c] border border-cyan-500/30 hover:bg-[#0a353d] transition text-cyan-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-black text-white">ABA ALUNOS - LISTA DE SALAS E CADEIRAS</h2>
              <button 
                onClick={() => fetchRoomsFromCloud()}
                className="p-2.5 rounded-xl bg-[#07262c] border border-cyan-500/30 text-cyan-300"
              >
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl space-y-4">
              <p className="text-sm text-cyan-300/80">Escolha abaixo a sala criada pelo professor para entrar e escolher sua cadeira (Senha padrão: 1234):</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleVerifyRoomPin(room)}
                    className="bg-slate-950 border border-cyan-500/40 hover:border-amber-400 p-5 rounded-2xl cursor-pointer shadow-lg transition transform hover:scale-102 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase bg-teal-900 text-teal-300 px-2.5 py-1 rounded-lg">
                          {room.subject || 'Geral'}
                        </span>
                        <span className="text-xs font-black text-amber-400 bg-slate-900 px-2.5 py-1 rounded-lg">
                          PIN: {room.code || '1234'}
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-white mb-1">{room.title}</h3>
                      <p className="text-xs text-cyan-300/70">{room.players?.length || 0} alunos já ocuparam cadeiras</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-cyan-900/50 flex items-center justify-between text-amber-400 font-bold text-xs">
                      <span>Entrar na Sala de Cadeiras</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 1.2 STUDENT ENTER ROOM PIN */}
        {view === 'student_enter_room_pin' && activeRoom && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-12">
            <div className="w-full bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
                  <Key className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-2xl font-black text-white">{activeRoom.title}</h2>
                <p className="text-sm text-cyan-300/70 mt-1">Digite a senha (PIN) da sala (Padrão: 1234)</p>
              </div>

              <form onSubmit={handleUnlockRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Senha da Sala</label>
                  <input
                    type="password"
                    required
                    value={roomPinInput}
                    onChange={(e) => setRoomPinInput(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-center text-2xl tracking-widest text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 transition mt-4"
                >
                  Entrar nas Cadeiras ➔
                </button>

                <button
                  type="button"
                  onClick={() => { setView('student_room_list'); soundFX.playClick(); }}
                  className="w-full py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-sm transition"
                >
                  Voltar às Salas
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 1.3 STUDENT CHAIR SELECTION (CADEIRAS DA SALA - MUDAM DE COR QUANDO OCUPADAS) */}
        {view === 'student_chair_selection' && activeRoom && (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full py-6 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white">{activeRoom.title} - Escolha sua Cadeira</h2>
              <p className="text-cyan-300/70 text-sm">Digite seu nome, escolha seu avatar e clique em uma cadeira livre (as ocupadas mudam de cor)</p>
            </div>

            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl space-y-6">
              {/* Name & Avatar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-cyan-900/50">
                <div>
                  <label className="block text-xs font-bold uppercase text-cyan-300 mb-1">Seu Nome</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Digite seu nome"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-cyan-300 mb-1">Avatar</label>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {avatars.map(av => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setSelectedAvatar(av)}
                        className={`text-xl p-2 rounded-xl border ${selectedAvatar === av ? 'bg-amber-400/30 border-amber-400 scale-110' : 'bg-slate-950 border-cyan-900'}`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chairs Grid (60 chairs) */}
              <div>
                <div className="flex items-center justify-between mb-3 text-xs font-bold text-cyan-300">
                  <span>Cadeiras Disponíveis (Verde) e Ocupadas (Vermelho/Cinza)</span>
                  <button onClick={() => fetchRoomsFromCloud()} className="text-amber-400 flex items-center space-x-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Atualizar Ocupação</span>
                  </button>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-[350px] overflow-y-auto pr-2">
                  {Array(60).fill(null).map((_, idx) => {
                    const occupant = activeRoom.chairs?.[idx];
                    const isOccupied = occupant != null;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectChairAndEnter(idx)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition ${isOccupied ? 'bg-red-950/80 border-red-500/60 text-red-300 cursor-not-allowed' : 'bg-slate-950 border-cyan-800/60 hover:bg-emerald-950 hover:border-emerald-400 text-cyan-200 shadow'}`}
                        title={isOccupied ? `Ocupado por ${occupant.name}` : `Cadeira ${idx + 1} - Livre`}
                      >
                        <Armchair className={`w-5 h-5 mb-1 ${isOccupied ? 'text-red-400' : 'text-cyan-400'}`} />
                        <span>#{idx + 1}</span>
                        <span className={`text-[9px] truncate max-w-full ${isOccupied ? 'text-red-300 font-black' : 'text-cyan-400'}`}>
                          {isOccupied ? occupant.name : 'Livre'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => { setView('student_room_list'); soundFX.playClick(); }}
                className="w-full py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold transition"
              >
                Voltar à Lista de Salas
              </button>
            </div>
          </div>
        )}

        {/* 1.5 TEACHER LOGIN SCREEN */}
        {view === 'teacher_login' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-12">
            <div className="w-full bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-2xl font-black text-white">Painel do Professor</h2>
                <p className="text-sm text-cyan-300/70 mt-1">Usuário: arenadejogos | Senha: 100529</p>
              </div>

              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Usuário</label>
                  <input
                    type="text"
                    required
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="arenadejogos"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Senha</label>
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 transition mt-4"
                >
                  Entrar no Painel ➔
                </button>

                <button
                  type="button"
                  onClick={() => { setView('home'); soundFX.playClick(); }}
                  className="w-full py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-sm transition"
                >
                  Voltar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 2. TEACHER DASHBOARD (ABA PROFESSOR - EDIÇÃO DAS SALAS COM CADEIRAS) */}
        {view === 'teacher_dashboard' && (
          <div className="flex-1 flex flex-col space-y-8 py-6">
            <div className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-2xl md:text-3xl py-4 px-8 rounded-2xl shadow-xl text-center uppercase tracking-wider">
              ABA PROFESSOR - CRIAÇÃO E EDIÇÃO DE SALAS E CADEIRAS
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Salas de Cadeiras Ativas (Editar Nome/PIN ou Apagar)</h3>
                  <button
                    onClick={() => { setEditingRoomId(null); setRoomTitle(''); setCustomPin('1234'); setView('create_room'); soundFX.playClick(); }}
                    className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow transition flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Criar Sala de Cadeiras</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-[#07262c] border border-cyan-500/30 rounded-2xl text-cyan-300/60">
                      Nenhuma sala de cadeiras criada. Crie uma nova sala definindo o nome e a senha (PIN).
                    </div>
                  ) : (
                    rooms.map((room) => (
                      <div 
                        key={room.id}
                        className="bg-[#07262c] border border-cyan-500/30 p-5 rounded-2xl shadow-lg flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase bg-teal-900 text-teal-300 px-2.5 py-1 rounded-lg">
                              {room.subject || 'Geral'}
                            </span>
                            <span className="text-xs font-black text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg">
                              PIN: {room.code || '1234'}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-white mb-1">{room.title}</h4>
                          <p className="text-xs text-cyan-300/70">
                            {room.chairs?.filter((c: any) => c != null).length || 0} / 60 cadeiras ocupadas
                          </p>
                        </div>

                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-cyan-900/50">
                          <button
                            onClick={() => { setActiveRoom(room); setView('teacher_live_control'); soundFX.playClick(); }}
                            className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs text-center shadow transition"
                          >
                            Ver Ocupação
                          </button>
                          <button
                            onClick={() => handleStartEditRoom(room)}
                            className="p-2 rounded-xl bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/30 text-cyan-300 transition"
                            title="Editar Nome e PIN"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja apagar permanentemente a sala "${room.title}" (PIN: ${room.code})?`)) {
                                deleteRoomFromCloudAndLocal(room.id, room.code);
                              }
                            }}
                            className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 transition"
                            title="Apagar Sala"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                    <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                    <span>Conteúdo / Questões</span>
                  </h3>
                  <p className="text-xs text-cyan-300/70 mb-6">
                    As salas de cadeiras utilizam os temas centrais (Geografia, Ciências, Vingadores) e perguntas interativas.
                  </p>

                  <button
                    onClick={() => { setView('home'); soundFX.playClick(); }}
                    className="w-full py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm shadow transition"
                  >
                    Ver Visão do Aluno ➔
                  </button>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-2xl border border-cyan-900/60 text-xs text-cyan-300/80">
                  🔒 <strong>Acesso Professor:</strong> arenadejogos / 100529
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. CREATE / EDIT ROOM FORM (CRIAR / EDITAR CADEIRAS & PIN) */}
        {view === 'create_room' && (
          <div className="flex-1 max-w-3xl mx-auto w-full py-6">
            <div className="flex items-center space-x-4 mb-6">
              <button 
                onClick={() => { setView('teacher_dashboard'); soundFX.playClick(); }}
                className="p-2.5 rounded-xl bg-[#07262c] border border-cyan-500/30 hover:bg-[#0a353d] transition"
              >
                <ArrowLeft className="w-5 h-5 text-cyan-300" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-white">{editingRoomId ? 'Editar Sala e Cadeiras' : 'Criar Nova Sala com Cadeiras (PIN 1234)'}</h2>
                <p className="text-sm text-cyan-300/70">Defina o nome da sala e a senha para os alunos acessarem.</p>
              </div>
            </div>

            <form onSubmit={handleSaveRoom} className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <label className="block text-sm font-bold text-cyan-200 mb-2">Tema Central / Matéria</label>
                <select
                  value={selectedTheme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-amber-400 mb-4"
                >
                  <option value="Geografia">🌍 Geografia</option>
                  <option value="Ciências">🔬 Ciências</option>
                  <option value="Filme Os Vingadores">🛡️ Filme Os Vingadores</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-cyan-200 mb-2">Nome da Sala de Cadeiras</label>
                  <input
                    type="text"
                    required
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder="Ex: Sala de Geografia - Turma 1"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-700 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-cyan-200 mb-2">Senha / PIN de Acesso (Ex: 1234)</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={customPin}
                    onChange={(e) => setCustomPin(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-700 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 transition"
              >
                {editingRoomId ? 'Salvar Alterações' : 'Criar Sala de Cadeiras'}
              </button>
            </form>
          </div>
        )}

        {/* 4. TEACHER LIVE CONTROL ROOM (VER CADEIRAS OCUPADAS EM TEMPO REAL) */}
        {view === 'teacher_live_control' && activeRoom && (
          <div className="flex-1 flex flex-col space-y-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Painel do Professor - Ocupação ao Vivo</span>
                <h2 className="text-3xl font-black text-white mt-1">{activeRoom.title}</h2>
                <p className="text-sm text-cyan-300/70">Senha (PIN): <strong className="text-amber-400 text-lg tracking-wider bg-slate-950 px-3 py-1 rounded-lg ml-2">{activeRoom.code || '1234'}</strong></p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => fetchRoomsFromCloud()}
                  className="px-4 py-3 rounded-2xl bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/30 text-cyan-300 font-bold transition flex items-center space-x-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Atualizar Alunos</span>
                </button>

                <button
                  onClick={() => { setView('teacher_dashboard'); soundFX.playClick(); }}
                  className="px-4 py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold transition"
                >
                  Voltar ao Painel
                </button>
              </div>
            </div>

            {/* Live Chairs Grid for Teacher */}
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  Mapa de Cadeiras (Ocupadas em Vermelho / Livres em Verde)
                </h3>
                <span className="text-amber-400 font-black text-sm">
                  {activeRoom.chairs?.filter((c: any) => c != null).length || 0} / 60 Ocupadas
                </span>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-[400px] overflow-y-auto pr-2">
                {Array(60).fill(null).map((_, idx) => {
                  const occupant = activeRoom.chairs?.[idx];
                  const isOccupied = occupant != null;

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-xs font-bold ${isOccupied ? 'bg-red-950/80 border-red-500 text-red-200 shadow-lg' : 'bg-slate-950 border-cyan-900 text-cyan-500 opacity-60'}`}
                    >
                      <Armchair className={`w-5 h-5 mb-1 ${isOccupied ? 'text-red-400' : 'text-cyan-600'}`} />
                      <span>#{idx + 1}</span>
                      <span className={`text-[10px] truncate max-w-full ${isOccupied ? 'text-amber-300 font-black' : 'text-cyan-600'}`}>
                        {isOccupied ? occupant.name : 'Livre'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 5. STUDENT GAME HUB (ARENA DE JOGOS) */}
        {view === 'student_game_hub' && activeRoom && (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full py-8 space-y-8">
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center text-3xl shadow-lg">
                  {student?.avatar || '🦁'}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">{student?.name}</h2>
                  <p className="text-xs text-amber-400 font-bold mt-0.5">
                    {activeRoom.title} &bull; Cadeira #{((student?.chairIndex ?? 0) + 1)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase text-cyan-300 font-bold block">Pontuação</span>
                <span className="text-3xl font-black text-amber-400">{student?.score || 0} pts</span>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-white mb-4">🎮 Arena de Jogos - {activeRoom.subject}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'quiz', title: 'Quiz Múltipla Escolha', desc: 'Responda rápido e ganhe pontos!', color: 'from-blue-600 to-cyan-600' },
                  { id: 'verdadeiro_falso', title: 'Verdadeiro ou Falso', desc: 'Desafio relâmpago de afirmações', color: 'from-emerald-600 to-teal-600' },
                  { id: 'forca', title: 'Jogo da Forca', desc: 'Adivinhe o termo educativo', color: 'from-amber-600 to-yellow-600' }
                ].map((game) => (
                  <div
                    key={game.id}
                    onClick={() => { setView('student_active_game'); soundFX.playClick(); }}
                    className={`bg-gradient-to-br ${game.color} border border-white/20 p-6 rounded-3xl cursor-pointer shadow-xl transition transform hover:scale-105 flex flex-col justify-between`}
                  >
                    <div>
                      <h4 className="text-xl font-black text-white mb-2">{game.title}</h4>
                      <p className="text-xs text-white/80">{game.desc}</p>
                    </div>
                    <div className="mt-6 inline-flex items-center space-x-2 text-white font-black text-sm">
                      <span>Jogar Agora</span>
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. STUDENT ACTIVE GAME SCREEN */}
        {view === 'student_active_game' && activeRoom && (
          <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full py-6 space-y-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => { setView('student_game_hub'); soundFX.playClick(); }}
                className="px-4 py-2 rounded-xl bg-[#07262c] border border-cyan-500/30 text-cyan-300 font-bold text-sm flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Hub de Jogos</span>
              </button>
              <span className="text-amber-400 font-black">{student?.score || 0} pts</span>
            </div>

            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-xl text-center space-y-8">
              <h3 className="text-2xl md:text-3xl font-black text-white leading-snug">
                {activeRoom?.questions?.[0]?.question || "Qual é a capital do Brasil?"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(activeRoom?.questions?.[0]?.options || ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"]).map((opt: string, idx: number) => {
                  const colors = [
                    'bg-red-600 hover:bg-red-500 border-red-400',
                    'bg-blue-600 hover:bg-blue-500 border-blue-400',
                    'bg-amber-600 hover:bg-amber-500 border-amber-400',
                    'bg-emerald-600 hover:bg-emerald-500 border-emerald-400'
                  ];
                  const symbols = ['▲', '◆', '●', '■'];

                  return (
                    <button
                      key={idx}
                      disabled={hasAnswered}
                      onClick={() => {
                        if (hasAnswered) return;
                        setHasAnswered(true);
                        setSelectedAnswer(idx);
                        const isCorrect = idx === (activeRoom?.questions?.[0]?.correctIndex ?? 0);
                        setAnswerResult(isCorrect);
                        if (isCorrect) {
                          soundFX.playCorrect();
                          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                          if (student) {
                            student.score = (student.score || 0) + 1000;
                          }
                        } else {
                          soundFX.playIncorrect();
                        }
                      }}
                      className={`${colors[idx]} border-2 p-6 rounded-2xl font-bold text-lg text-white shadow-lg transition transform active:scale-95 flex items-center space-x-4 disabled:opacity-70 ${selectedAnswer === idx ? 'ring-4 ring-white' : ''}`}
                    >
                      <span className="text-2xl">{symbols[idx]}</span>
                      <span className="flex-1 text-left">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {hasAnswered && (
                <div className={`p-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 animate-bounce ${answerResult ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300' : 'bg-red-500/20 border border-red-400 text-red-300'}`}>
                  {answerResult ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                  <span>{answerResult ? 'Resposta Correta! +1000 pts' : 'Resposta Incorreta!'}</span>
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-900/40 py-4 text-center text-xs text-cyan-400/60 z-10">
        Arena de Jogos &bull; Aba Alunos (Lista de Cadeiras) &bull; Aba Professor (Criação e Edição de Salas)
      </footer>

    </div>
  );
}
