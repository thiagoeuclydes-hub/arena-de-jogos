import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface GameRoom {
  id: string;
  code: string;
  title: string;
  subject: string;
  gameType: 'quiz' | 'forca' | 'verdadeiro_falso' | 'cores' | 'stop';
  status: 'waiting' | 'playing' | 'ended';
  currentQuestionIndex: number;
  professorChosenColor?: string | null;
  questions: any[];
  players: {
    id: string;
    name: string;
    avatar: string;
    score: number;
    streak: number;
    lastAnswerCorrect?: boolean;
  }[];
  createdAt: number;
}

const activeRooms = new Map<string, GameRoom>();

// Seed default rooms for instant testing
const defaultRoom: GameRoom = {
  id: 'room_555555',
  code: '555555',
  title: 'Sala 5 - Jogo das Cores',
  subject: 'Cores',
  gameType: 'cores',
  status: 'waiting',
  currentQuestionIndex: -1,
  professorChosenColor: null,
  questions: [{ id: 1 }],
  players: [],
  createdAt: Date.now()
};
activeRooms.set('555555', defaultRoom);

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = process.env.PORT || 3000;

  // Gemini AI Question Generator Endpoint
  app.post('/api/generate-questions', async (req, res) => {
    try {
      const { topic, gameType, count = 5 } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY não configurada.' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Gere ${count} perguntas de múltipla escolha sobre: "${topic}" em Português no formato JSON: [{ "question": "...", "options": ["..."], "correctIndex": 0 }]`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const text = response.text || '[]';
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      res.json({ questions: parsed });
    } catch (error: any) {
      console.error('Error generating questions:', error);
      res.status(500).json({ error: error.message || 'Erro ao gerar.' });
    }
  });

  // Rooms API
  app.get('/api/rooms', (req, res) => {
    const rooms = Array.from(activeRooms.values());
    res.json(rooms);
  });

  app.post('/api/rooms', (req, res) => {
    const { title, subject, gameType, questions } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const id = 'room_' + Date.now();

    const newRoom: GameRoom = {
      id,
      code,
      title: title || 'Sala de Aula',
      subject: subject || 'Geral',
      gameType: gameType || 'quiz',
      status: 'waiting',
      currentQuestionIndex: -1,
      professorChosenColor: null,
      questions: questions || [],
      players: [],
      createdAt: Date.now(),
    };

    activeRooms.set(code, newRoom);
    res.json(newRoom);
  });

  app.get('/api/rooms/:code', (req, res) => {
    const room = activeRooms.get(req.params.code);
    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }
    res.json(room);
  });

  app.post('/api/rooms/:code/join', (req, res) => {
    const { code } = req.params;
    const { name, avatar } = req.body;
    const room = activeRooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    // Check if player already exists by name or create new
    const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    const newPlayer = {
      id: playerId,
      name: name || 'Aluno',
      avatar: avatar || '🦁',
      score: 0,
      streak: 0,
    };

    room.players.push(newPlayer);
    res.json({ player: newPlayer, room });
  });

  app.post('/api/rooms/:code/status', (req, res) => {
    const { code } = req.params;
    const { status, currentQuestionIndex } = req.body;
    const room = activeRooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    if (status !== undefined) room.status = status;
    if (currentQuestionIndex !== undefined) room.currentQuestionIndex = currentQuestionIndex;

    res.json(room);
  });

  app.post('/api/rooms/:code/color', (req, res) => {
    const { code } = req.params;
    const { professorChosenColor } = req.body;
    const room = activeRooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    room.professorChosenColor = professorChosenColor;
    res.json(room);
  });

  app.post('/api/rooms/:code/answer', (req, res) => {
    const { code } = req.params;
    const { playerId, pointsEarned } = req.body;
    const room = activeRooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.score += (pointsEarned || 0);
      room.players.sort((a, b) => b.score - a.score);
    }

    res.json(room);
  });

  app.delete('/api/rooms/:code', (req, res) => {
    const { code } = req.params;
    activeRooms.delete(code);
    res.json({ success: true });
  });

  // Setup Vite middleware for frontend development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`> LudusArena server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
