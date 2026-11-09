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
  db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
  console.log("Firebase initialized successfully");
} catch (e) {
  console.error("Firebase init error:", e);
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

export default function App() {
  const [view, setView] = useState<'home' | 'teacher_login' | 'teacher_dashboard' | 'create_room' | 'student_enter_pin' | 'student_mode_select' | 'student_individual_chair' | 'student_team_select' | 'student_room_entry' | 'student_game_hub' | 'student_active_game' | 'teacher_live_control'>('home');
  const [rooms, setRooms] = useState<any[]>([
    { id: 'room_1', code: '100529', title: 'Sala 1 - Geografia Global', subject: 'Geografia', gameType: 'quiz', status: 'waiting', currentQuestionIndex: -1, questions: THEME_PRESETS["Geografia"], players: [], teams: Array.from({length: 10}, (_, i) => ({ id: i+1, name: `Equipe ${i+1}`, members: [] })), chairs: Array(60).fill(null), createdAt: Date.now() },
    { id: 'room_2', code: '555555', title: 'Sala 5 - Jogo das Cores', subject: 'Ciências', gameType: 'quiz', status: 'waiting', currentQuestionIndex: -1, questions: THEME_PRESETS["Ciências"], players: [], teams: Array.from({length: 10}, (_, i) => ({ id: i+1, name: `Equipe ${i+1}`, members: [] })), chairs: Array(60).fill(null), createdAt: Date.now() }
  ]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [studentPinInput, setStudentPinInput] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [muted, setMuted] = useState(false);

  // Teacher Login States
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Form states for creating/editing room
  const [roomTitle, setRoomTitle] = useState('');
  const [customPin, setCustomPin] = useState('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomSubject, setRoomSubject] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('Geografia');
  const [gameType, setGameType] = useState<'quiz' | 'verdadeiro_falso' | 'forca' | 'cores' | 'stop'>('quiz');
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<any[]>(THEME_PRESETS["Geografia"]);
  
  // Student join & chair selection states
  const [studentName, setStudentName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦁');
  const [playMode, setPlayMode] = useState<'individual' | 'team'>('individual');
  const [selectedChair, setSelectedChair] = useState<number | null>(null);
  const [selectedTeamRoom, setSelectedTeamRoom] = useState<number | null>(null);

  // Active game in Arena
  const [activeGameType, setActiveGameType] = useState<'quiz' | 'forca' | 'verdadeiro_falso' | 'cores' | 'stop'>('quiz');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<boolean | null>(null);

  // Sync with Firebase Firestore & localStorage fallback
  useEffect(() => {
    if (db) {
      try {
        const unsubscribe = onSnapshot(collection(db, 'rooms'), (snapshot: any) => {
          const loadedRooms: any[] = [];
          snapshot.forEach((docSnap: any) => {
            const data = docSnap.data();
            loadedRooms.push({
              ...data,
              id: docSnap.id,
              chairs: data.chairs || Array(60).fill(null),
              teams: data.teams || Array.from({length: 10}, (_, i) => ({ id: i+1, name: `Equipe ${i+1}`, members: [] })),
              players: data.players || [],
              questions: data.questions || THEME_PRESETS["Geografia"]
            });
          });
          if (loadedRooms.length > 0) {
            setRooms(loadedRooms);
            localStorage.setItem('ludus_rooms', JSON.stringify(loadedRooms));
          } else {
            // Seed initial rooms if empty in Firestore
            rooms.forEach(async (r) => {
              await setDoc(doc(db, 'rooms', r.id), r);
            });
          }
        }, (err: any) => {
          console.error("Firestore snapshot error:", err);
          loadLocalStorageFallback();
        });
        return () => unsubscribe();
      } catch (e) {
        console.error("Firestore init error:", e);
        loadLocalStorageFallback();
      }
    } else {
      loadLocalStorageFallback();
    }
  }, []);

  const loadLocalStorageFallback = () => {
    try {
      const local = localStorage.getItem('ludus_rooms');
      if (local) {
        const parsed = JSON.parse(local);
        setRooms(parsed);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveRoomToCloudAndLocal = async (room: any) => {
    const updated = rooms.map(r => r.id === room.id ? room : r);
    if (!updated.some(r => r.id === room.id)) {
      updated.unshift(room);
    }
    setRooms(updated);
    localStorage.setItem('ludus_rooms', JSON.stringify(updated));

    if (db) {
      try {
        await setDoc(doc(db, 'rooms', room.id), room);
      } catch (e) {
        console.error("Cloud save error:", e);
      }
    }
  };

  const deleteRoomFromCloudAndLocal = async (roomId: string, roomCode: string) => {
    const updated = rooms.filter(r => r.id !== roomId && r.code !== roomCode);
    setRooms(updated);
    localStorage.setItem('ludus_rooms', JSON.stringify(updated));

    if (db) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId));
      } catch (e) {
        console.error("Cloud delete error:", e);
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
    } else {
      alert('Usuário ou senha do professor incorretos. Use arenadejogos / 100529');
    }
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    setRoomTitle(`Sala - ${theme}`);
    setRoomSubject(theme);
    if (THEME_PRESETS[theme]) {
      setQuestions(THEME_PRESETS[theme]);
    }
    soundFX.playClick();
  };

  const downloadExcelTemplate = (type: 'quiz' | 'verdadeiro_falso' | 'forca') => {
    soundFX.playClick();
    let sampleData = [];
    if (type === 'quiz') {
      sampleData = [
        { Pergunta: 'Qual a capital do Brasil?', Opcao1: 'São Paulo', Opcao2: 'Rio de Janeiro', Opcao3: 'Brasília', Opcao4: 'Salvador', RespostaCorretaIndice: 2 }
      ];
    } else if (type === 'verdadeiro_falso') {
      sampleData = [
        { Afirmacao: 'A Terra é redonda.', EVerdadeiro: 'TRUE', Explicacao: 'Formato geoide.' }
      ];
    } else {
      sampleData = [
        { Palavra: 'GEOGRAFIA', Dica: 'Estudo da Terra e territórios' }
      ];
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, `template_${type}_arenadejogos.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'quiz' | 'verdadeiro_falso' | 'forca') => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundFX.playClick();
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let parsedQuestions: any[] = [];
        if (type === 'quiz') {
          parsedQuestions = data.map((row: any) => ({
            question: row.Pergunta || row.question || 'Pergunta',
            options: [row.Opcao1 || 'A', row.Opcao2 || 'B', row.Opcao3 || 'C', row.Opcao4 || 'D'],
            correctIndex: Number(row.RespostaCorretaIndice ?? row.correctIndex ?? 0)
          }));
        } else if (type === 'verdadeiro_falso') {
          parsedQuestions = data.map((row: any) => ({
            statement: row.Afirmacao || row.statement || 'Afirmação',
            isTrue: String(row.EVerdadeiro).toUpperCase() === 'TRUE' || row.isTrue === true,
            explanation: row.Explicacao || ''
          }));
        } else {
          parsedQuestions = data.map((row: any) => ({
            word: String(row.Palavra || row.word || 'EXEMPLO').toUpperCase(),
            hint: row.Dica || row.hint || 'Sem dica'
          }));
        }

        setQuestions(parsedQuestions);
        setGameType(type as any);
        setView('create_room');
        alert(`Arquivo importado com sucesso! ${parsedQuestions.length} itens carregados.`);
      } catch (err) {
        console.error(err);
        alert('Erro ao processar o arquivo Excel/CSV.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle) {
      alert('Preencha o título da sala.');
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
        room.subject = roomSubject || selectedTheme;
        saveRoomToCloudAndLocal(room);
      }
      setEditingRoomId(null);
      setView('teacher_dashboard');
    } else {
      const code = customPin.trim() || Math.floor(100000 + Math.random() * 900000).toString();
      const newRoom = {
        id: 'room_' + Date.now(),
        code,
        title: roomTitle,
        subject: roomSubject || selectedTheme,
        gameType,
        status: 'waiting',
        currentQuestionIndex: -1,
        questions,
        players: [],
        teams: Array.from({length: 10}, (_, i) => ({ id: i+1, name: `Equipe ${i+1}`, members: [] })),
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
    setRoomSubject(room.subject || '');
    setView('create_room');
  };

  const handleVerifyStudentPin = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.playClick();
    const found = rooms.find(r => r.code === studentPinInput.trim());
    if (found) {
      setActiveRoom(found);
      setView('student_mode_select');
      setStudentPinInput('');
    } else {
      alert('Sala não encontrada com este PIN. Verifique com o professor o PIN correto.');
    }
  };

  const handleSelectSeatAndEnterRoom = () => {
    if (!studentName.trim()) {
      alert('Digite seu nome.');
      return;
    }
    if (playMode === 'individual' && selectedChair === null) {
      alert('Escolha uma cadeira na sala individual (1 a 60).');
      return;
    }
    if (playMode === 'team' && (selectedTeamRoom === null || selectedChair === null)) {
      alert('Escolha uma equipe e uma cadeira.');
      return;
    }

    soundFX.playClick();
    
    const room = activeRoom || rooms[0] || {
      id: 'default_room',
      code: '100529',
      title: 'Arena Principal',
      subject: selectedTheme,
      questions: THEME_PRESETS["Geografia"],
      players: [],
      chairs: Array(60).fill(null),
      teams: Array.from({length: 10}, (_, i) => ({ id: i+1, name: `Equipe ${i+1}`, members: [] }))
    };

    const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    const newPlayer = {
      id: playerId,
      name: studentName,
      avatar: selectedAvatar,
      score: 0,
      streak: 0,
      mode: playMode,
      chairNumber: selectedChair,
      teamId: playMode === 'team' ? selectedTeamRoom : null
    };

    if (playMode === 'individual') {
      room.chairs[selectedChair as number] = newPlayer;
    } else {
      const team = room.teams.find((t: any) => t.id === selectedTeamRoom);
      if (team) {
        team.members.push(newPlayer);
      }
    }

    room.players.push(newPlayer);
    saveRoomToCloudAndLocal(room);
    setActiveRoom(room);
    setStudent(newPlayer);
    setView('student_room_entry');
  };

  const updateRoomStatus = (status: string, qIndex?: number) => {
    soundFX.playClick();
    if (activeRoom) {
      activeRoom.status = status;
      if (qIndex !== undefined) activeRoom.currentQuestionIndex = qIndex;
      saveRoomToCloudAndLocal(activeRoom);
      setActiveRoom({ ...activeRoom });
    }
  };

  const submitAnswer = (answerIndex: number) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    setSelectedAnswer(answerIndex);

    const questionsList = activeRoom?.questions || THEME_PRESETS["Geografia"];
    const currentQ = questionsList[0];
    const isCorrect = (answerIndex === (currentQ.correctIndex ?? 0));

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
  };

  const avatars = ['🦁', '🚀', '🦊', '⚡', '👑', '🦄', '🦖', '🎸', '🤖', '🐱'];

  return (
    <div className="min-h-screen bg-[#031317] bg-grid-pattern text-white font-sans selection:bg-amber-400 selection:text-slate-950 flex flex-col relative overflow-x-hidden">
      
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between z-50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setView('home'); setActiveRoom(null); setStudent(null); }}>
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

            <div className="relative group cursor-pointer mb-10" onClick={() => { setView('student_enter_pin'); soundFX.playClick(); }}>
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
              Digite o PIN da sala aberta pelo professor, escolha o modo Individual ou Equipe, escolha sua cadeira e vá para a Arena de Jogos!
            </p>

            <button
              onClick={() => { setView('student_enter_pin'); soundFX.playClick(); }}
              className="px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-lg shadow-xl shadow-cyan-500/30 transition transform hover:scale-105 flex items-center space-x-2"
            >
              <Key className="w-5 h-5" />
              <span>ENTRAR NA SALA DE JOGO 🚀</span>
            </button>
          </div>
        )}

        {/* 1.1 STUDENT ENTER PIN SCREEN */}
        {view === 'student_enter_pin' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-12">
            <div className="w-full bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center mx-auto mb-4">
                  <Key className="w-7 h-7 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-black text-white">Entrar com PIN da Sala</h2>
                <p className="text-sm text-cyan-300/70 mt-1">Digite o PIN fornecido pelo professor</p>
              </div>

              <form onSubmit={handleVerifyStudentPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">PIN da Sala</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={studentPinInput}
                    onChange={(e) => setStudentPinInput(e.target.value)}
                    placeholder="Ex: 100529"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-center text-2xl tracking-widest text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 transition mt-4"
                >
                  Acessar Sala ➔
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

        {/* 2. TEACHER DASHBOARD */}
        {view === 'teacher_dashboard' && (
          <div className="flex-1 flex flex-col space-y-8 py-6">
            <div className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-2xl md:text-3xl py-4 px-8 rounded-2xl shadow-xl text-center uppercase tracking-wider">
              PAINEL DO PROFESSOR - GERENCIAMENTO DE SALAS
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Salas Ativas (Editar PIN/Nome ou Apagar)</h3>
                  <button
                    onClick={() => { setEditingRoomId(null); setRoomTitle(''); setCustomPin(''); setView('create_room'); soundFX.playClick(); }}
                    className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow transition flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Criar Nova Sala</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-[#07262c] border border-cyan-500/30 rounded-2xl text-cyan-300/60">
                      Nenhuma sala ativa. Crie uma nova sala definindo o nome e o PIN.
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
                              PIN: {room.code}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-white mb-1">{room.title}</h4>
                          <p className="text-xs text-cyan-300/70">{room.players?.length || 0} alunos conectados</p>
                        </div>

                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-cyan-900/50">
                          <button
                            onClick={() => { setActiveRoom(room); setView('teacher_live_control'); soundFX.playClick(); }}
                            className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs text-center shadow transition"
                          >
                            Gerenciar
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
                    <span>Inserir Conteúdo (Excel / CSV)</span>
                  </h3>
                  <p className="text-xs text-cyan-300/70 mb-6">
                    Importe perguntas em formato Excel para qualquer sala.
                  </p>

                  <div className="space-y-4">
                    {[
                      { type: 'forca', label: 'INSERIR FORCA' },
                      { type: 'verdadeiro_falso', label: 'INSERIR V/F' },
                      { type: 'quiz', label: 'INSERIR QUIZ' }
                    ].map((item) => (
                      <div key={item.type} className="bg-slate-200 hover:bg-white border-2 border-slate-400 rounded-2xl p-4 text-slate-950 font-black shadow-lg text-center space-y-2">
                        <span>{item.label}</span>
                        <div className="flex gap-2 justify-center pt-1">
                          <button
                            onClick={() => downloadExcelTemplate(item.type as any)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Modelo</span>
                          </button>
                          <label className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-1 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Importar</span>
                            <input 
                              type="file" 
                              accept=".xlsx, .xls, .csv" 
                              className="hidden" 
                              onChange={(e) => handleFileUpload(e, item.type as any)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-2xl border border-cyan-900/60 text-xs text-cyan-300/80">
                  🔒 <strong>Área Protegida:</strong> Apenas o professor com login (arenadejogos / 100529) acessa este painel.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. CREATE / EDIT ROOM FORM */}
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
                <h2 className="text-2xl font-black text-white">{editingRoomId ? 'Editar Sala (Nome e PIN)' : 'Criar Nova Sala com PIN'}</h2>
                <p className="text-sm text-cyan-300/70">Atualize as informações da sala para os alunos.</p>
              </div>
            </div>

            <form onSubmit={handleSaveRoom} className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <label className="block text-sm font-bold text-cyan-200 mb-2">Tema Central</label>
                <select
                  value={selectedTheme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-amber-400 mb-4"
                >
                  <option value="Geografia">🌍 Geografia</option>
                  <option value="Ciências">🔬 Ciências</option>
                  <option value="Filme Os Vingadores">🛡️ Filme Os Vingadores</option>
                  <option value="História">📜 História</option>
                  <option value="Matemática">📐 Matemática</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-cyan-200 mb-2">Nome / Título da Sala</label>
                  <input
                    type="text"
                    required
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder="Ex: Aula de Geografia - Turma A"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-700 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-cyan-200 mb-2">PIN de Acesso (Ex: 100529)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={customPin}
                    onChange={(e) => setCustomPin(e.target.value)}
                    placeholder="Novo PIN ou automático"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-700 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 transition"
              >
                {editingRoomId ? 'Salvar Alterações da Sala' : 'Abrir Sala e Gerar PIN'}
              </button>
            </form>
          </div>
        )}

        {/* 4. TEACHER LIVE CONTROL ROOM */}
        {view === 'teacher_live_control' && activeRoom && (
          <div className="flex-1 flex flex-col space-y-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Painel de Controle ao Vivo</span>
                <h2 className="text-3xl font-black text-white mt-1">{activeRoom.title}</h2>
                <p className="text-sm text-cyan-300/70">PIN da Sala: <strong className="text-amber-400 text-lg tracking-wider bg-slate-950 px-3 py-1 rounded-lg ml-2">{activeRoom.code}</strong></p>
              </div>

              <div className="flex items-center space-x-3">
                {activeRoom.status === 'waiting' && (
                  <button
                    onClick={() => updateRoomStatus('playing', 0)}
                    className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-lg shadow-amber-500/30 flex items-center space-x-2 transition"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Iniciar Jogo Agora</span>
                  </button>
                )}

                {activeRoom.status === 'playing' && (
                  <button
                    onClick={() => updateRoomStatus('waiting', -1)}
                    className="px-4 py-3 rounded-2xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 font-bold transition"
                  >
                    Pausar Jogo
                  </button>
                )}

                <button
                  onClick={() => { setView('teacher_dashboard'); soundFX.playClick(); }}
                  className="px-4 py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold transition"
                >
                  Voltar ao Painel
                </button>
              </div>
            </div>

            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-2">Alunos Conectados na Sala: {activeRoom.players?.length || 0}</h3>
              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {activeRoom.players?.map((p: any) => (
                  <div key={p.id} className="bg-slate-950 border border-cyan-900 px-4 py-2 rounded-xl flex items-center space-x-2">
                    <span className="text-xl">{p.avatar}</span>
                    <span className="font-bold text-sm text-amber-300">{p.name}</span>
                    <span className="text-xs text-cyan-400">({p.mode === 'individual' ? `Cadeira #${(p.chairNumber ?? 0) + 1}` : `Equipe ${p.teamId}`})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. STUDENT MODE SELECT (INDIVIDUAL OU EQUIPE) */}
        {view === 'student_mode_select' && activeRoom && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-xl mx-auto w-full py-12 text-center space-y-6">
            <div className="inline-block bg-amber-400/20 border border-amber-400 text-amber-400 text-xs font-bold px-4 py-1.5 rounded-full">
              Sala: {activeRoom.title} (PIN: {activeRoom.code})
            </div>

            <h2 className="text-4xl font-black text-white">Escolha o Modo de Jogo</h2>
            <p className="text-cyan-300/80 text-sm">Como você deseja participar da aula?</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-6">
              <div 
                onClick={() => { setPlayMode('individual'); setView('student_individual_chair'); soundFX.playClick(); }}
                className="bg-[#07262c] hover:bg-[#0a353d] border-2 border-cyan-500/40 hover:border-amber-400 p-8 rounded-3xl cursor-pointer shadow-xl transition transform hover:scale-105 flex flex-col items-center space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-400/20 flex items-center justify-center text-amber-400">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white">Sala Individual</h3>
                <p className="text-xs text-cyan-300/70">Escolha uma das 60 cadeiras disponíveis e jogue por conta própria.</p>
              </div>

              <div 
                onClick={() => { setPlayMode('team'); setView('student_team_select'); soundFX.playClick(); }}
                className="bg-[#07262c] hover:bg-[#0a353d] border-2 border-cyan-500/40 hover:border-amber-400 p-8 rounded-3xl cursor-pointer shadow-xl transition transform hover:scale-105 flex flex-col items-center space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center text-teal-300">
                  <UsersRound className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white">Sala em Equipe</h3>
                <p className="text-xs text-cyan-300/70">Escolha uma das 10 equipes (6 cadeiras cada) e jogue em grupo.</p>
              </div>
            </div>

            <button
              onClick={() => { setView('student_enter_pin'); soundFX.playClick(); }}
              className="mt-4 px-6 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-xs"
            >
              ← Digitar Outro PIN
            </button>
          </div>
        )}

        {/* 6. INDIVIDUAL CHAIR SELECTION (60 CHAIRS) */}
        {view === 'student_individual_chair' && activeRoom && (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full py-6 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white">Sala Individual - Escolha sua Cadeira (1 a 60)</h2>
              <p className="text-cyan-300/70 text-sm">Sala: {activeRoom.title} | Digite seu nome, escolha seu avatar e clique em uma cadeira livre</p>
            </div>

            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl space-y-6">
              {/* Name & Avatar inputs */}
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

              {/* 60 Chairs Grid */}
              <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-[350px] overflow-y-auto pr-2">
                {Array(60).fill(null).map((_, idx) => {
                  const isSelected = selectedChair === idx;
                  const isOccupied = activeRoom.chairs?.[idx] != null;
                  return (
                    <button
                      key={idx}
                      disabled={isOccupied}
                      onClick={() => { setSelectedChair(idx); soundFX.playClick(); }}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition ${isOccupied ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50' : isSelected ? 'bg-amber-400 border-yellow-200 text-slate-950 scale-105 shadow-lg' : 'bg-slate-950 border-cyan-800/60 hover:bg-[#0a353d] text-cyan-200'}`}
                    >
                      <Armchair className="w-5 h-5 mb-1" />
                      <span>{idx + 1}</span>
                      {isOccupied && <span className="text-[9px] text-red-400">Ocupada</span>}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={selectedChair === null || !studentName.trim()}
                onClick={handleSelectSeatAndEnterRoom}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl transition disabled:opacity-50"
              >
                Entrar na Sala de Jogo ➔
              </button>
            </div>
          </div>
        )}

        {/* 7. TEAM ROOMS SELECT (10 teams x 6 chairs) */}
        {view === 'student_team_select' && activeRoom && (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full py-6 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-white">Sala em Equipe (10 Salas x 6 Cadeiras)</h2>
              <p className="text-cyan-300/70 text-sm">Sala: {activeRoom.title} | Digite seu nome, escolha sua equipe e sua vaga</p>
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

              {/* 10 Teams List */}
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                {Array.from({length: 10}, (_, teamIdx) => teamIdx + 1).map((teamId) => {
                  const teamObj = activeRoom.teams?.find((t: any) => t.id === teamId) || { members: [] };
                  return (
                    <div key={teamId} className="bg-slate-950 border border-cyan-900/60 rounded-2xl p-4 space-y-3">
                      <h4 className="font-black text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <UsersRound className="w-5 h-5 text-amber-400" />
                          <span>Equipe {teamId}</span>
                        </div>
                        <span className="text-xs text-cyan-400 font-normal">{teamObj.members?.length || 0}/6 membros</span>
                      </h4>

                      <div className="grid grid-cols-6 gap-2">
                        {Array.from({length: 6}, (_, chairIdx) => {
                          const isSelectedTeam = selectedTeamRoom === teamId;
                          const isSelectedChair = selectedChair === chairIdx;
                          const isThisSeatSelected = isSelectedTeam && isSelectedChair;
                          const isOccupied = (teamObj.members?.length || 0) > chairIdx;

                          return (
                            <button
                              key={chairIdx}
                              disabled={isOccupied}
                              onClick={() => { setSelectedTeamRoom(teamId); setSelectedChair(chairIdx); soundFX.playClick(); }}
                              className={`p-3 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition ${isOccupied ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed opacity-50' : isThisSeatSelected ? 'bg-amber-400 border-yellow-200 text-slate-950 scale-105 shadow-lg' : 'bg-[#07262c] border-cyan-800 hover:bg-[#0a353d] text-cyan-200'}`}
                            >
                              <Armchair className="w-5 h-5 mb-1" />
                              <span>Vaga {chairIdx + 1}</span>
                              {isOccupied && <span className="text-[9px] text-red-400">Ocupada</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                disabled={selectedTeamRoom === null || selectedChair === null || !studentName.trim()}
                onClick={handleSelectSeatAndEnterRoom}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl transition disabled:opacity-50"
              >
                Entrar na Sala de Jogo ➔
              </button>
            </div>
          </div>
        )}

        {/* 8. STUDENT ROOM ENTRY (SALA DE JOGO) */}
        {view === 'student_room_entry' && activeRoom && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full py-12 text-center space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-5xl mx-auto shadow-2xl animate-bounce">
              <DoorOpen className="w-12 h-12 text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-950 bg-amber-400 px-3 py-1 rounded-lg">Você entrou na Sala de Jogo!</span>
              <h2 className="text-3xl font-black text-white mt-2">{activeRoom.title}</h2>
              <p className="text-cyan-300/80 text-sm mt-1">Aluno: <strong>{student?.name}</strong> {student?.avatar}</p>
              <p className="text-xs text-amber-400 mt-1 font-bold">
                {student?.mode === 'individual' ? `Cadeira Individual #${(student?.chairNumber ?? 0) + 1}` : `Equipe ${student?.teamId} (Vaga ${(student?.chairNumber ?? 0) + 1})`}
              </p>
            </div>

            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 w-full space-y-3">
              <div className="flex items-center justify-center space-x-2 text-cyan-300 font-bold">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Alunos na Sala: {activeRoom.players?.length || 1}</span>
              </div>
              <p className="text-xs text-cyan-300/60">
                Tudo pronto! Clique abaixo para ir para a Arena de Jogos e resolver as questões propostas pelo professor.
              </p>
            </div>

            <button
              onClick={() => { setView('student_game_hub'); soundFX.playClick(); }}
              className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg shadow-xl animate-pulse"
            >
              Ir para a Arena de Jogos ➔
            </button>
          </div>
        )}

        {/* 9. STUDENT GAME HUB (ARENA DE JOGOS COM OS JOGOS) */}
        {view === 'student_game_hub' && (
          <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full py-8 space-y-8">
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 flex items-center justify-between shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center text-3xl shadow-lg">
                  {student?.avatar || '🦁'}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">{student?.name}</h2>
                  <p className="text-xs text-amber-400 font-bold mt-0.5">
                    {student?.mode === 'individual' ? `Cadeira Individual #${(student?.chairNumber ?? 0) + 1}` : `Equipe ${student?.teamId} (Vaga ${(student?.chairNumber ?? 0) + 1})`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase text-cyan-300 font-bold block">Pontuação</span>
                <span className="text-3xl font-black text-amber-400">{student?.score || 0} pts</span>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-white mb-4">🎮 Arena de Jogos - Escolha um Jogo ({activeRoom?.subject || 'Geral'})</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { id: 'quiz', title: 'Quiz Múltipla Escolha', desc: 'Responda rápido e ganhe pontos!', color: 'from-blue-600 to-cyan-600' },
                  { id: 'verdadeiro_falso', title: 'Verdadeiro ou Falso', desc: 'Desafio relâmpago de afirmações', color: 'from-emerald-600 to-teal-600' },
                  { id: 'forca', title: 'Jogo da Forca', desc: 'Adivinhe o termo educativo', color: 'from-amber-600 to-yellow-600' }
                ].map((game) => (
                  <div
                    key={game.id}
                    onClick={() => { setActiveGameType(game.id as any); setView('student_active_game'); soundFX.playClick(); }}
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

        {/* 10. STUDENT ACTIVE GAME SCREEN */}
        {view === 'student_active_game' && (
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
                      onClick={() => submitAnswer(idx)}
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
        Arena de Jogos &bull; Salas Individuais (60 cadeiras) e Equipes (10 salas x 6 cadeiras)
      </footer>

    </div>
  );
}
