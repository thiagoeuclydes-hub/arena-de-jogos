import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, collection, query, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Users, Play, Settings, Plus, Copy, RefreshCw, LogOut, 
  CheckCircle2, XCircle, Palette, HelpCircle, Gamepad2, Type, 
  Timer as TimerIcon, Trash2, UserMinus
} from 'lucide-react';
import { Room, Participant, GameType, Theme, HangmanWord } from './types';
import * as XLSX from 'xlsx';

// Components
import Home from './components/Home';
import ProfessorPanel from './components/ProfessorPanel';
import StudentFlow from './components/StudentFlow';
import Arena from './components/Arena';
import ColorGame from './components/games/ColorGame';
import VFGame from './components/games/VFGame';
import QuizGame from './components/games/QuizGame';
import HangmanGame from './components/games/HangmanGame';
import StopGame from './components/games/StopGame';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'home' | 'professor' | 'student' | 'arena'>('home');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [studentInfo, setStudentInfo] = useState<{ name: string; team?: string; roomId: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentRoom) {
      const q = query(collection(db, 'rooms', currentRoom.id, 'participants'), orderBy('points', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const pList: Participant[] = [];
        snapshot.forEach((doc) => pList.push(doc.data() as Participant));
        setParticipants(pList);
      });
      return unsubscribe;
    }
  }, [currentRoom?.id]);

  // Sync Room state
  useEffect(() => {
    if (studentInfo?.roomId) {
      const unsubscribe = onSnapshot(doc(db, 'rooms', studentInfo.roomId), (doc) => {
        if (doc.exists()) {
          setCurrentRoom({ id: doc.id, ...doc.data() } as Room);
        }
      });
      return unsubscribe;
    }
  }, [studentInfo?.roomId]);

  const handleProfessorLogin = async () => {
    const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setView('professor');
    } catch (error) {
      console.error("Login failed", error);
      // Fallback to anonymous for demo if Google fails or isn't configured
      await signInAnonymously(auth);
      setView('professor');
    }
  };

  const enterAsStudent = async (name: string, roomId: string, team?: string) => {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const participantData: Participant = {
      uid,
      name,
      points: 0,
      isOnline: true,
    };
    if (team) participantData.team = team;

    await setDoc(doc(db, 'rooms', roomId, 'participants', uid), participantData);
    setStudentInfo({ name, team, roomId });
    setView('arena');
  };

  const logout = () => {
    auth.signOut();
    setView('home');
    setCurrentRoom(null);
    setStudentInfo(null);
  };


  return (
    <div className="min-h-screen font-['Fredoka'] text-white overflow-hidden bg-slate-950">
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <Home key="home" onProfessor={handleProfessorLogin} onStudent={() => setView('student')} />
        )}

        {view === 'professor' && (
          <ProfessorPanel 
            key="professor"
            onBack={() => setView('home')} 
            onRoomSelect={(room) => setCurrentRoom(room)}
          />
        )}

        {view === 'student' && (
          <StudentFlow 
            key="student"
            onBack={() => setView('home')} 
            onEnter={enterAsStudent} 
          />
        )}

        {view === 'arena' && currentRoom && (
          <Arena 
            key="arena"
            room={currentRoom} 
            participants={participants}
            onLogout={logout}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
