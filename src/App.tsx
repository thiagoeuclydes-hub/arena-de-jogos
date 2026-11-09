import React, { useState, useEffect } from 'react';
import { GraduationCap, Gamepad2, Plus, Trash2, Edit3, Armchair, Lock, Key, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

// Firebase imports with graceful local fallback
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

export default function App() {
  const [view, setView] = useState<'home' | 'teacher_login' | 'teacher_dashboard' | 'create_room' | 'student_room_list' | 'student_room_pin' | 'student_chair_grid' | 'student_in_chair'>('home');
  
  const [rooms, setRooms] = useState<any[]>(() => {
    try {
      const local = localStorage.getItem('arenadejogos_clean_rooms');
      if (local) return JSON.parse(local);
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'room_default', title: 'Sala Principal de Cadeiras', code: '1234', chairs: Array(60).fill(null), createdAt: Date.now() }
    ];
  });

  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedChairIdx, setSelectedChairIdx] = useState<number | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState('🦁');
  const avatars = ['🦁', '🚀', '🦊', '⚡', '👑', '🦄', '🦖', '🎸', '🤖', '🐱'];

  // Teacher login inputs
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // Room form inputs
  const [roomTitleInput, setRoomTitleInput] = useState('');
  const [roomPinInput, setRoomPinInput] = useState('1234');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);

  // Sync rooms with Firestore
  const fetchRooms = async () => {
    setIsSyncing(true);
    let currentRooms = [...rooms];
    try {
      const local = localStorage.getItem('arenadejogos_clean_rooms');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) currentRooms = parsed;
      }
    } catch (e) {
      console.error(e);
    }

    if (db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'rooms'));
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const idx = currentRooms.findIndex(r => r.id === docSnap.id);
          const formatted = {
            id: docSnap.id,
            title: data.title || 'Sala de Cadeiras',
            code: data.code || '1234',
            chairs: data.chairs || Array(60).fill(null),
            createdAt: data.createdAt || Date.now()
          };
          if (idx >= 0) {
            currentRooms[idx] = formatted;
          } else {
            currentRooms.push(formatted);
          }
        });
      } catch (e) {
        console.warn("Cloud sync warning:", e);
      }
    }

    if (currentRooms.length === 0) {
      currentRooms = [{ id: 'room_default', title: 'Sala Principal de Cadeiras', code: '1234', chairs: Array(60).fill(null), createdAt: Date.now() }];
    }

    setRooms(currentRooms);
    try {
      localStorage.setItem('arenadejogos_clean_rooms', JSON.stringify(currentRooms));
    } catch (e) {
      console.error(e);
    }

    if (activeRoom) {
      const updatedActive = currentRooms.find(r => r.id === activeRoom.id);
      if (updatedActive) setActiveRoom(updatedActive);
    }
    setIsSyncing(false);
  };

  useEffect(() => {
    fetchRooms();
    let unsubscribe: any = null;
    if (db) {
      try {
        unsubscribe = onSnapshot(collection(db, 'rooms'), (snapshot: any) => {
          const loaded: any[] = [];
          snapshot.forEach((docSnap: any) => {
            const data = docSnap.data();
            loaded.push({
              id: docSnap.id,
              title: data.title || 'Sala de Cadeiras',
              code: data.code || '1234',
              chairs: data.chairs || Array(60).fill(null),
              createdAt: data.createdAt || Date.now()
            });
          });
          if (loaded.length > 0) {
            setRooms(loaded);
            localStorage.setItem('arenadejogos_clean_rooms', JSON.stringify(loaded));
            if (activeRoom) {
              const updatedActive = loaded.find(r => r.id === activeRoom.id);
              if (updatedActive) setActiveRoom(updatedActive);
            }
          }
        });
      } catch (e) {
        console.warn("Snapshot error:", e);
      }
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const saveRoomCloudAndLocal = async (room: any) => {
    const updated = rooms.map(r => r.id === room.id ? room : r);
    if (!updated.some(r => r.id === room.id)) {
      updated.unshift(room);
    }
    setRooms(updated);
    try {
      localStorage.setItem('arenadejogos_clean_rooms', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (db) {
      try {
        await setDoc(doc(db, 'rooms', room.id), room, { merge: true });
      } catch (e) {
        console.warn("Cloud save error:", e);
      }
    }
  };

  const deleteRoomCloudAndLocal = async (roomId: string) => {
    const updated = rooms.filter(r => r.id !== roomId);
    setRooms(updated.length > 0 ? updated : [{ id: 'room_default', title: 'Sala Principal', code: '1234', chairs: Array(60).fill(null), createdAt: Date.now() }]);
    try {
      localStorage.setItem('arenadejogos_clean_rooms', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (db) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId));
      } catch (e) {
        console.warn("Cloud delete error:", e);
      }
    }
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim() === 'arenadejogos' && passwordInput.trim() === '100529') {
      setView('teacher_dashboard');
      setUsernameInput('');
      setPasswordInput('');
      fetchRooms();
    } else {
      alert('Usuário ou senha incorretos. Use arenadejogos / 100529');
    }
  };

  const handleSaveRoomForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitleInput.trim()) {
      alert('Digite o nome da sala.');
      return;
    }

    if (editingRoomId) {
      const room = rooms.find(r => r.id === editingRoomId);
      if (room) {
        room.title = roomTitleInput.trim();
        room.code = roomPinInput.trim() || '1234';
        saveRoomCloudAndLocal(room);
      }
      setEditingRoomId(null);
      setView('teacher_dashboard');
    } else {
      const newRoom = {
        id: 'room_' + Date.now(),
        title: roomTitleInput.trim(),
        code: roomPinInput.trim() || '1234',
        chairs: Array(60).fill(null),
        createdAt: Date.now()
      };
      saveRoomCloudAndLocal(newRoom);
      setActiveRoom(newRoom);
      setView('teacher_dashboard');
    }
    setRoomTitleInput('');
    setRoomPinInput('1234');
  };

  const handleSelectRoomToJoin = (room: any) => {
    setActiveRoom(room);
    setView('student_room_pin');
  };

  const handleVerifyRoomPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === String(activeRoom.code)) {
      setView('student_chair_grid');
      setPinInput('');
    } else {
      alert('Senha incorreta! A senha padrão é 1234 (ou a definida pelo professor).');
    }
  };

  const handleChooseChair = async (chairIdx: number) => {
    if (!studentName.trim()) {
      alert('Digite seu nome antes de escolher a cadeira.');
      return;
    }

    await fetchRooms();
    const currentRoom = rooms.find(r => r.id === activeRoom.id) || activeRoom;
    if (!currentRoom.chairs) currentRoom.chairs = Array(60).fill(null);

    if (currentRoom.chairs[chairIdx] !== null) {
      alert('Esta cadeira já está ocupada por outro aluno!');
      return;
    }

    currentRoom.chairs[chairIdx] = {
      name: studentName.trim(),
      avatar: selectedAvatar,
      time: new Date().toLocaleTimeString()
    };

    await saveRoomCloudAndLocal(currentRoom);
    setActiveRoom(currentRoom);
    setSelectedChairIdx(chairIdx);
    setView('student_in_chair');
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="min-h-screen bg-[#031317] bg-grid-pattern text-white font-sans flex flex-col selection:bg-amber-400 selection:text-slate-950">
      
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between z-50 border-b border-cyan-950">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setView('home'); setActiveRoom(null); }}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Gamepad2 className="w-6 h-6 text-slate-950" />
          </div>
          <h1 className="text-xl font-black tracking-wider text-amber-400">
            ARENA DE JOGOS
          </h1>
        </div>

        <button 
          onClick={() => { fetchRooms(); alert('Salas e cadeiras sincronizadas!'); }}
          className="px-4 py-2 rounded-xl bg-[#07262c] border border-cyan-500/30 hover:bg-[#0a353d] transition text-cyan-300 text-xs font-bold flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Sincronizar</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-6xl mx-auto w-full z-10">

        {/* ================= 1. HOME SCREEN ================= */}
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center text-center space-y-12 my-auto py-12">
            
            <div className="space-y-3">
              <span className="px-4 py-1.5 rounded-full bg-[#07262c] border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-widest">
                Plataforma de Aula Gamificada
              </span>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white">
                Bem-vindo à <span className="text-amber-400">Arena de Jogos</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl mt-4">
              
              {/* BOTÃO 1: ÁREA DO PROFESSOR */}
              <button
                onClick={() => setView('teacher_login')}
                className="group bg-[#07262c] hover:bg-[#0a353d] border-2 border-cyan-500/40 hover:border-amber-400 p-8 rounded-3xl shadow-xl transition transform hover:scale-105 flex flex-col items-center text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">ÁREA DO PROFESSOR</h3>
                  <p className="text-xs text-cyan-300/70 mt-1">Gerenciamento de salas, criação e edição de cadeiras</p>
                </div>
              </button>

              {/* BOTÃO 2: ARENA DE JOGOS (BEM GRANDE E CENTRAL) */}
              <button
                onClick={() => { fetchRooms(); setView('student_room_list'); }}
                className="group relative bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 p-8 rounded-3xl shadow-2xl border-2 border-yellow-200 transform transition hover:scale-105 flex flex-col items-center text-center space-y-4"
              >
                <div className="absolute -inset-1 bg-amber-400 rounded-3xl blur opacity-30 group-hover:opacity-100 transition"></div>
                <div className="relative w-16 h-16 rounded-2xl bg-slate-950 flex items-center justify-center text-amber-400 shadow-lg group-hover:scale-110 transition">
                  <Gamepad2 className="w-8 h-8" />
                </div>
                <div className="relative">
                  <h3 className="text-2xl font-black tracking-tight text-slate-950">ARENA DE JOGOS</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-900 mt-1 opacity-90">
                    Entrar na Sala &bull; Escolher Cadeira
                  </p>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* ================= 2. TEACHER LOGIN ================= */}
        {view === 'teacher_login' && (
          <div className="flex flex-col items-center justify-center max-w-md mx-auto w-full py-12">
            <div className="w-full bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-2xl font-black text-white">Área do Professor</h2>
                <p className="text-xs text-cyan-300/70 mt-1">Usuário: arenadejogos | Senha: 100529</p>
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
                  onClick={() => setView('home')}
                  className="w-full py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-sm transition"
                >
                  Voltar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= 3. TEACHER DASHBOARD ================= */}
        {view === 'teacher_dashboard' && (
          <div className="flex-1 flex flex-col space-y-6 w-full py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#07262c] border border-cyan-500/30 p-6 rounded-3xl shadow-xl">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Painel Administrativo</span>
                <h2 className="text-3xl font-black text-white mt-1">Gerenciamento de Salas e Cadeiras</h2>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => { setEditingRoomId(null); setRoomTitleInput(''); setRoomPinInput('1234'); setView('create_room'); }}
                  className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow transition flex items-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Criar Sala de Cadeiras</span>
                </button>
                <button
                  onClick={() => setView('home')}
                  className="px-4 py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold transition text-sm"
                >
                  Sair
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => {
                const occupiedCount = room.chairs?.filter((c: any) => c != null).length || 0;
                return (
                  <div key={room.id} className="bg-[#07262c] border border-cyan-500/30 p-6 rounded-3xl shadow-xl flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-amber-400 bg-slate-950 px-3 py-1 rounded-lg">
                          PIN: {room.code || '1234'}
                        </span>
                        <span className="text-xs font-bold text-cyan-300">
                          {occupiedCount}/60 Ocupadas
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white mb-2">{room.title}</h3>
                      
                      {/* Live occupancy preview */}
                      <div className="bg-slate-950 p-3 rounded-xl max-h-32 overflow-y-auto space-y-1">
                        {occupiedCount === 0 ? (
                          <p className="text-xs text-cyan-300/50 italic">Nenhum aluno sentado ainda.</p>
                        ) : (
                          room.chairs.map((c: any, idx: number) => c ? (
                            <div key={idx} className="text-xs flex items-center justify-between text-cyan-200">
                              <span>Cadeira #{idx + 1}: <strong className="text-amber-400">{c.avatar} {c.name}</strong></span>
                              <span className="text-[10px] text-cyan-400/70">{c.time}</span>
                            </div>
                          ) : null)
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-3 border-t border-cyan-900/50">
                      <button
                        onClick={() => { setEditingRoomId(room.id); setRoomTitleInput(room.title); setRoomPinInput(room.code); setView('create_room'); }}
                        className="flex-1 py-2 rounded-xl bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/30 text-cyan-300 text-xs font-bold flex items-center justify-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Deseja apagar a sala "${room.title}"?`)) {
                            deleteRoomCloudAndLocal(room.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 transition"
                        title="Apagar Sala"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 4. CREATE / EDIT ROOM (CRIAR CADEIRAS) ================= */}
        {view === 'create_room' && (
          <div className="flex-1 max-w-xl mx-auto w-full py-12">
            <div className="w-full bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
                  <Armchair className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-2xl font-black text-white">{editingRoomId ? 'Editar Sala de Cadeiras' : 'Criar Sala de Cadeiras'}</h2>
                <p className="text-sm text-cyan-300/70 mt-1">Defina o nome e a senha (PIN) para os alunos entrarem</p>
              </div>

              <form onSubmit={handleSaveRoomForm} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Nome da Sala</label>
                  <input
                    type="text"
                    required
                    value={roomTitleInput}
                    onChange={(e) => setRoomTitleInput(e.target.value)}
                    placeholder="Ex: Sala de Aula - Turma A"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Senha (PIN)</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={roomPinInput}
                    onChange={(e) => setRoomPinInput(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-center text-xl tracking-widest text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 transition mt-4"
                >
                  {editingRoomId ? 'Salvar Alterações' : 'Criar Sala'}
                </button>

                <button
                  type="button"
                  onClick={() => setView('teacher_dashboard')}
                  className="w-full py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-sm transition"
                >
                  Voltar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= 5. STUDENT ROOM LIST (ARENA DE JOGOS) ================= */}
        {view === 'student_room_list' && (
          <div className="flex-1 max-w-3xl mx-auto w-full py-8 space-y-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setView('home')}
                className="p-2.5 rounded-xl bg-[#07262c] border border-cyan-500/30 text-cyan-300 hover:bg-[#0a353d] transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-black text-amber-400">ARENA DE JOGOS - ESCOLHA A SALA</h2>
              <button 
                onClick={() => fetchRooms()}
                className="p-2.5 rounded-xl bg-[#07262c] border border-cyan-500/30 text-cyan-300"
              >
                <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl space-y-4">
              <p className="text-sm text-cyan-300/80">Selecione abaixo a sala criada pelo professor para entrar:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleSelectRoomToJoin(room)}
                    className="bg-slate-950 border border-cyan-500/40 hover:border-amber-400 p-6 rounded-2xl cursor-pointer shadow-lg transition transform hover:scale-102 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-amber-400 bg-slate-900 px-3 py-1 rounded-lg">
                          PIN: {room.code || '1234'}
                        </span>
                        <span className="text-xs text-cyan-300 font-bold">
                          {room.chairs?.filter((c: any) => c != null).length || 0}/60 Ocupadas
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white">{room.title}</h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-cyan-900/50 flex items-center justify-between text-amber-400 font-bold text-sm">
                      <span>Entrar na Sala ➔</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= 6. STUDENT ROOM PIN ================= */}
        {view === 'student_room_pin' && activeRoom && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-12">
            <div className="w-full bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
                  <Key className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-2xl font-black text-white">{activeRoom.title}</h2>
                <p className="text-sm text-cyan-300/70 mt-1">Digite a senha (PIN) da sala (Padrão: 1234)</p>
              </div>

              <form onSubmit={handleVerifyRoomPin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Senha da Sala</label>
                  <input
                    type="password"
                    required
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
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
                  onClick={() => setView('student_room_list')}
                  className="w-full py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold text-sm transition"
                >
                  Voltar
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ================= 7. STUDENT CHAIR GRID (CADEIRAS MUDAM DE COR) ================= */}
        {view === 'student_chair_grid' && activeRoom && (
          <div className="flex-1 max-w-4xl mx-auto w-full py-6 space-y-6">
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

              {/* Chairs Grid */}
              <div>
                <div className="flex items-center justify-between mb-3 text-xs font-bold text-cyan-300">
                  <span>Cadeiras Livres (Verde/Azul) e Ocupadas (Vermelho/Ocupada)</span>
                  <button onClick={() => fetchRooms()} className="text-amber-400 flex items-center space-x-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Atualizar</span>
                  </button>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 max-h-[380px] overflow-y-auto pr-2">
                  {Array(60).fill(null).map((_, idx) => {
                    const occupant = activeRoom.chairs?.[idx];
                    const isOccupied = occupant != null;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleChooseChair(idx)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition ${isOccupied ? 'bg-red-950/90 border-red-500 text-red-200 cursor-not-allowed' : 'bg-slate-950 border-cyan-800 hover:bg-emerald-950 hover:border-emerald-400 text-cyan-200 shadow'}`}
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
                onClick={() => setView('student_room_list')}
                className="w-full py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold transition"
              >
                Voltar à Lista de Salas
              </button>
            </div>
          </div>
        )}

        {/* ================= 8. STUDENT IN CHAIR CONFIRMATION ================= */}
        {view === 'student_in_chair' && activeRoom && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-12 text-center space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-5xl mx-auto shadow-2xl animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-amber-400" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-950 bg-amber-400 px-3 py-1 rounded-lg">Cadeira Ocupada com Sucesso!</span>
              <h2 className="text-3xl font-black text-white mt-2">{activeRoom.title}</h2>
              <p className="text-cyan-300/80 text-sm mt-1">{selectedAvatar} {studentName} &bull; Cadeira #{((selectedChairIdx ?? 0) + 1)}</p>
            </div>

            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 w-full space-y-3 text-xs text-cyan-300/80">
              <p>O professor já pode visualizar no computador da sala que você ocupou esta cadeira em tempo real!</p>
            </div>

            <button
              onClick={() => setView('home')}
              className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg shadow-xl"
            >
              Voltar ao Início 🏠
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-950 py-4 text-center text-xs text-cyan-400/60 z-10">
        Arena de Jogos &bull; Área do Professor &bull; Arena de Jogos (Cadeiras em Tempo Real)
      </footer>

    </div>
  );
}
