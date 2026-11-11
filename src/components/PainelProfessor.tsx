import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Armchair, ArrowLeft, RefreshCw, LogOut, Lock, Unlock, Trophy, Gamepad2, Settings, BookOpen, Layers } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import * as XLSX from 'xlsx';

interface PainelProfessorProps {
  onLogout: () => void;
}

export const PainelProfessor: React.FC<PainelProfessorProps> = ({ onLogout }) => {
  const [salas, setSalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form modal state (Criar / Editar Sala)
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('1234');
  const [numCadeiras, setNumCadeiras] = useState(20);

  // Banco de Questões & Temas State
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [activeQuestionGame, setActiveQuestionGame] = useState<'forca' | 'verdadeiro_falso' | 'quiz'>('quiz');
  const defaultThemes = ['BRASIL', 'ALAGOAS', 'CIENCIAS', 'FILME: JACK', 'FILME VINGADORES'];
  const [customTemas, setCustomTemas] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('arena_custom_temas');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [selectedTema, setSelectedTema] = useState('BRASIL');
  const [novoTemaInput, setNovoTemaInput] = useState('');
  const [editTemaModal, setEditTemaModal] = useState(false);
  const [temaParaEditar, setTemaParaEditar] = useState('');
  const [temaEditadoNome, setTemaEditadoNome] = useState('');
  const [deleteTemaModalOpen, setDeleteTemaModalOpen] = useState(false);
  const [temaParaDeletar, setTemaParaDeletar] = useState('');

  const [deletedTemas, setDeletedTemas] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('arena_deleted_temas');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });
  const [questoesBanco, setQuestoesBanco] = useState<any[]>([]);

  const bancoTemas = questoesBanco.map(q => q.tema).filter(Boolean);
  const rawTemasList = Array.from(new Set([...defaultThemes, ...customTemas, ...bancoTemas]));
  const temasList = rawTemasList.filter(t => !deletedTemas.includes(t));

  // Form question fields
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [qIsTrue, setQIsTrue] = useState(true);
  const [qWord, setQWord] = useState('');
  const [qHint, setQHint] = useState('');



  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setError('Firebase não configurado. Preencha as variáveis de ambiente em .env');
      setLoading(false);
      return;
    }

    const unsubSalas = onSnapshot(
      collection(db as any, 'salas'),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setSalas(list);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar salas:", err);
        setError('Erro ao carregar dados do Firestore. Verifique as permissões.');
        setLoading(false);
      }
    );

    const unsubBanco = onSnapshot(
      collection(db as any, 'banco_questoes'),
      (snapshot) => {
        const list: any[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        setQuestoesBanco(list);
      },
      (err) => {
        console.error("Erro ao carregar banco de questões:", err);
      }
    );

    return () => {
      unsubSalas();
      unsubBanco();
    };
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setNome('');
    setPin('1234');
    setNumCadeiras(20);
    setShowModal(true);
  };

  const handleOpenEdit = (sala: any) => {
    setEditingId(sala.id);
    setNome(sala.nome || '');
    setPin(sala.pin || '1234');
    setNumCadeiras(sala.cadeiras?.length || 20);
    setShowModal(true);
  };

  const handleSaveSala = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !db) return;

    try {
      if (editingId) {
        const salaRef = doc(db as any, 'salas', editingId);
        const existingSala = salas.find(s => s.id === editingId);
        const oldCadeiras = existingSala?.cadeiras || [];
        
        const newCadeiras = Array.from({ length: Number(numCadeiras) }, (_, i) => {
          if (oldCadeiras[i]) {
            return oldCadeiras[i];
          }
          return { id: i + 1, ocupada: false, nomeAluno: '', avatar: '', score: 0 };
        });

        await updateDoc(salaRef, {
          nome: nome.trim(),
          pin: pin.trim() || '1234',
          cadeiras: newCadeiras
        });
      } else {
        const cadeiras = Array.from({ length: Number(numCadeiras) }, (_, i) => ({
          id: i + 1,
          ocupada: false,
          nomeAluno: '',
          avatar: '',
          score: 0
        }));

        await addDoc(collection(db as any, 'salas'), {
          nome: nome.trim(),
          pin: pin.trim() || '1234',
          cadeiras,
          jogoLiberado: false,
          jogoAtivo: 'quiz',
          jogosStatus: { quiz: false, forca: false, verdadeiro_falso: false, jogo_das_cores: false, stop_adedonha: false },
          criadoEm: serverTimestamp()
        });
      }

      setShowModal(false);
    } catch (err) {
      console.error("Erro ao salvar sala:", err);
      alert('Erro ao salvar no Firestore.');
    }
  };

  const handleDeleteSala = async (id: string, nomeSala: string) => {
    if (!db) {
      alert('Banco de dados não conectado.');
      return;
    }
    if (!id) {
      alert('ID da sala inválido.');
      return;
    }
    try {
      await deleteDoc(doc(db as any, 'salas', id));
      alert(`Sala "${nomeSala || 'Sem Nome'}" apagada com sucesso!`);
    } catch (err: any) {
      console.error("Erro ao apagar sala:", err);
      alert('Erro ao apagar sala: ' + (err?.message || err));
    }
  };

  const handleToggleLiberarJogos = async (salaId: string, currentState: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'salas', salaId), {
        jogoLiberado: !currentState
      });
    } catch (err) {
      console.error("Erro ao alterar liberação de jogos:", err);
    }
  };

  const handleChangeJogoAtivo = async (salaId: string, novoJogo: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'salas', salaId), {
        jogoAtivo: novoJogo
      });
    } catch (err) {
      console.error("Erro ao alterar jogo ativo:", err);
    }
  };

  const handleSetGameStatus = async (salaId: string, gameId: string, status: boolean) => {
    if (!db) return;
    try {
      const sala = salas.find(s => s.id === salaId);
      const currentStatus = sala?.jogosStatus || {};
      await updateDoc(doc(db as any, 'salas', salaId), {
        jogosStatus: { ...currentStatus, [gameId]: status },
        jogoAtivo: gameId
      });
    } catch (err) {
      console.error("Erro ao alterar status do jogo:", err);
    }
  };

  const handleSetCorProibida = async (salaId: string, cor: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'salas', salaId), {
        corProibida: cor
      });
    } catch (err) {
      console.error("Erro ao definir cor proibida:", err);
    }
  };

  const handleKickStudent = async (salaId: string, chairId: number) => {
    if (!db) return;
    try {
      const sala = salas.find(s => s.id === salaId);
      if (!sala) return;

      const updatedCadeiras = sala.cadeiras.map((c: any) => {
        if (c.id === chairId) {
          return { id: c.id, ocupada: false, nomeAluno: '', avatar: '', score: 0 };
        }
        return c;
      });

      await updateDoc(doc(db as any, 'salas', salaId), {
        cadeiras: updatedCadeiras
      });
    } catch (err) {
      console.error("Erro ao liberar cadeira:", err);
    }
  };

  const handleLiberarTodas = async (salaId: string) => {
    if (!db) return;
    try {
      const sala = salas.find(s => s.id === salaId);
      if (!sala) return;

      const updatedCadeiras = sala.cadeiras.map((c: any) => ({
        id: c.id,
        ocupada: false,
        nomeAluno: '',
        avatar: '',
        score: 0
      }));

      await updateDoc(doc(db as any, 'salas', salaId), {
        cadeiras: updatedCadeiras
      });
      alert('Todas as cadeiras foram limpas com sucesso!');
    } catch (err: any) {
      console.error("Erro ao liberar todas as cadeiras:", err);
      alert('Erro ao limpar cadeiras: ' + (err?.message || err));
    }
  };

  const handleSetCorRodada = async (salaId: string, cor: string) => {
    if (!db) return;
    try {
      const sala = salas.find(s => s.id === salaId);
      const currentRodada = sala?.rodadaId || 0;
      await updateDoc(doc(db as any, 'salas', salaId), {
        corRodada: cor,
        rodadaId: currentRodada + 1,
        jogoCoresLiberado: true
      });
    } catch (err) {
      console.error("Erro ao definir cor da rodada:", err);
    }
  };

  const handleToggleJogoCores = async (salaId: string, currentState: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'salas', salaId), {
        jogoCoresLiberado: !currentState
      });
    } catch (err) {
      console.error("Erro ao alternar jogo das cores:", err);
    }
  };

  const handleToggleJogoForca = async (salaId: string, currentState: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'salas', salaId), {
        jogoForcaLiberado: !currentState
      });
    } catch (err) {
      console.error("Erro ao alternar jogo da forca:", err);
    }
  };

  const handleLiberarPalavraForca = async (salaId: string, word: string, hint: string) => {
    if (!db || !word) return;
    try {
      const sala = salas.find(s => s.id === salaId);
      const currentRodada = sala?.forcaRodadaId || 0;
      await updateDoc(doc(db as any, 'salas', salaId), {
        palavraAtivaForca: word.toUpperCase().trim(),
        dicaAtivaForca: hint.trim(),
        forcaRodadaId: currentRodada + 1,
        jogoForcaLiberado: true
      });
      alert(`Palavra "${word}" liberada com sucesso para os alunos!`);
    } catch (err) {
      console.error("Erro ao liberar palavra da forca:", err);
      alert('Erro ao liberar palavra.');
    }
  };

  const handleToggleJogoQuiz = async (salaId: string, currentState: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'salas', salaId), {
        jogoQuizLiberado: !currentState
      });
    } catch (err) {
      console.error("Erro ao alternar jogo do quiz:", err);
    }
  };

  const handleLiberarPerguntaQuiz = async (salaId: string, qItem: any) => {
    if (!db || !qItem) return;
    try {
      const sala = salas.find(s => s.id === salaId);
      const currentRodada = sala?.quizRodadaId || 0;
      await updateDoc(doc(db as any, 'salas', salaId), {
        perguntaAtivaQuiz: {
          question: qItem.question,
          options: qItem.options,
          correctIndex: qItem.correctIndex ?? 0,
          tema: qItem.tema
        },
        quizRodadaId: currentRodada + 1,
        jogoQuizLiberado: true
      });
      alert(`Pergunta de Quiz liberada com sucesso para os alunos!`);
    } catch (err) {
      console.error("Erro ao liberar pergunta do quiz:", err);
      alert('Erro ao liberar pergunta.');
    }
  };

  const handleToggleJogoVF = async (salaId: string, currentState: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'salas', salaId), {
        jogoVFLiberado: !currentState
      });
    } catch (err) {
      console.error("Erro ao alternar jogo V/F:", err);
    }
  };

  const handleLiberarAfirmacaoVF = async (salaId: string, vfItem: any) => {
    if (!db || !vfItem) return;
    try {
      const sala = salas.find(s => s.id === salaId);
      const currentRodada = sala?.vfRodadaId || 0;
      await updateDoc(doc(db as any, 'salas', salaId), {
        afirmacaoAtivaVF: {
          statement: vfItem.statement,
          isTrue: vfItem.isTrue,
          tema: vfItem.tema
        },
        vfRodadaId: currentRodada + 1,
        jogoVFLiberado: true
      });
      alert(`Afirmação V/F liberada com sucesso para os alunos!`);
    } catch (err) {
      console.error("Erro ao liberar afirmação V/F:", err);
      alert('Erro ao liberar afirmação.');
    }
  };

  const handleToggleJogoQuadrado = async (salaId: string, currentState: boolean) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'salas', salaId), {
        jogoQuadradoLiberado: !currentState
      });
    } catch (err) {
      console.error("Erro ao alternar jogo do quadrado:", err);
    }
  };

  const handleSetSecretQuadrado = async (salaId: string, squareIdx: number) => {
    if (!db) return;
    try {
      await updateDoc(doc(db as any, 'salas', salaId), {
        secretQuadradoProfessor: squareIdx
      });
    } catch (err) {
      console.error("Erro ao definir quadrado secreto do professor:", err);
    }
  };

  const handleProcessarRodadaQuadrado = async (salaId: string) => {
    if (!db) return;
    try {
      const sala = salas.find(s => s.id === salaId);
      if (!sala) return;

      const profSecret = sala.secretQuadradoProfessor;
      if (typeof profSecret !== 'number') {
        alert('O professor precisa escolher um quadrado secreto antes de revelar!');
        return;
      }

      const choices = sala.escolhasAlunosQuadrado || {};
      const cadeiras = sala.cadeiras || [];

      const choiceCounts: { [sq: number]: number } = {};
      Object.values(choices).forEach((sq: any) => {
        choiceCounts[sq] = (choiceCounts[sq] || 0) + 1;
      });

      const updatedCadeiras = cadeiras.map((c: any) => {
        if (!c.ocupada) return c;
        if (c.eliminadoQuadrado) return c;

        const studentChoice = choices[c.id];
        if (studentChoice === undefined) {
          return c;
        }

        let currentScore = c.score || 0;
        let isEliminated = false;

        if (studentChoice === profSecret) {
          isEliminated = true;
        } else if (choiceCounts[studentChoice] > 1) {
          currentScore -= 5;
          if (currentScore <= 0) {
            isEliminated = true;
          }
        } else {
          currentScore += 20;
        }

        return {
          ...c,
          score: currentScore,
          eliminadoQuadrado: isEliminated
        };
      });

      const currentRodada = sala.quadradoRodadaId || 0;

      await updateDoc(doc(db as any, 'salas', salaId), {
        cadeiras: updatedCadeiras,
        quadradoRodadaId: currentRodada + 1,
        escolhasAlunosQuadrado: {},
        secretQuadradoProfessor: null,
        ultimoResultadoQuadrado: `Rodada processada! Quadrado secreto do professor era o #${profSecret + 1}.`
      });

      alert(`Rodada do Quadrado processada com sucesso! O quadrado secreto revelado era #${profSecret + 1}.`);
    } catch (err: any) {
      console.error("Erro ao processar rodada do quadrado:", err);
      alert('Erro ao processar rodada: ' + (err?.message || err));
    }
  };

  // Banco de Questões handlers
  const handleOpenQuestionModal = (gameType: 'forca' | 'verdadeiro_falso' | 'quiz') => {
    setActiveQuestionGame(gameType);
    setShowQuestionModal(true);
  };

  const handleCreateTema = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTemaInput.trim()) return;
    const t = novoTemaInput.trim().toUpperCase();
    if (!temasList.includes(t)) {
      const updatedCustom = [...customTemas, t];
      setCustomTemas(updatedCustom);
      try {
        localStorage.setItem('arena_custom_temas', JSON.stringify(updatedCustom));
      } catch (e) {}
      setSelectedTema(t);
    }
    setNovoTemaInput('');
  };

  const handleUpdateTema = (e: React.FormEvent) => {
    e.preventDefault();
    if (!temaEditadoNome.trim()) return;
    const novo = temaEditadoNome.trim().toUpperCase();
    const updatedCustom = customTemas.map(t => t === temaParaEditar ? novo : t);
    if (!updatedCustom.includes(novo) && !defaultThemes.includes(novo)) {
      updatedCustom.push(novo);
    }
    setCustomTemas(updatedCustom);
    try {
      localStorage.setItem('arena_custom_temas', JSON.stringify(updatedCustom));
    } catch (e) {}
    if (selectedTema === temaParaEditar) {
      setSelectedTema(novo);
    }
    setEditTemaModal(false);
    setTemaParaEditar('');
    setTemaEditadoNome('');
  };

  const handleDeleteTema = (temaToDelete: string) => {
    setTemaParaDeletar(temaToDelete);
    setDeleteTemaModalOpen(true);
  };

  const handleConfirmDeleteTema = () => {
    if (!temaParaDeletar) return;
    const temaToDelete = temaParaDeletar;

    const updatedCustom = customTemas.filter(t => t !== temaToDelete);
    const updatedDeleted = Array.from(new Set([...deletedTemas, temaToDelete]));
    setCustomTemas(updatedCustom);
    setDeletedTemas(updatedDeleted);
    try {
      localStorage.setItem('arena_custom_temas', JSON.stringify(updatedCustom));
      localStorage.setItem('arena_deleted_temas', JSON.stringify(updatedDeleted));
    } catch (e) {}

    if (db) {
      questoesBanco.forEach(async (q) => {
        if (q.tema === temaToDelete) {
          try {
            await deleteDoc(doc(db as any, 'banco_questoes', q.id));
          } catch (err) {
            console.error("Erro ao apagar questão do tema:", err);
          }
        }
      });
    }

    if (selectedTema === temaToDelete) {
      setSelectedTema('BRASIL');
    }

    setDeleteTemaModalOpen(false);
    setTemaParaDeletar('');
    alert(`Tema "${temaToDelete}" apagado com sucesso!`);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    try {
      let qData: any = { tema: selectedTema, tipo: activeQuestionGame };
      if (activeQuestionGame === 'quiz') {
        qData.question = qText;
        qData.options = qOptions;
        qData.correctIndex = qCorrectIdx;
      } else if (activeQuestionGame === 'verdadeiro_falso') {
        qData.statement = qText;
        qData.isTrue = qIsTrue;
      } else if (activeQuestionGame === 'forca') {
        qData.word = qWord.toUpperCase().trim();
        qData.hint = qHint;
      }
      await addDoc(collection(db as any, 'banco_questoes'), {
        ...qData,
        criadoEm: serverTimestamp()
      });
      alert('Questão/Palavra adicionada ao banco com sucesso!');
      setQText('');
      setQWord('');
      setQHint('');
      setQOptions(['', '', '', '']);
    } catch (err: any) {
      console.error("Erro ao adicionar questão:", err);
      alert('Erro ao salvar questão: ' + (err?.message || err));
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!db) return;
    if (window.confirm('Deseja apagar esta questão do banco?')) {
      try {
        await deleteDoc(doc(db as any, 'banco_questoes', id));
      } catch (err) {
        console.error("Erro ao apagar questão:", err);
      }
    }
  };

  const handleDownloadTemplate = (gameType: 'forca' | 'verdadeiro_falso' | 'quiz') => {
    let wsData: any[][] = [];
    let filename = "";

    if (gameType === 'quiz') {
      wsData = [
        ["Pergunta", "Opção 1", "Opção 2", "Opção 3", "Opção 4", "Índice Correto (0 a 3)"],
        ["Qual a capital do Brasil?", "Rio de Janeiro", "São Paulo", "Brasília", "Salvador", 2],
        ["Qual o maior planeta do sistema solar?", "Marte", "Júpiter", "Vênus", "Saturno", 1]
      ];
      filename = `modelo_quiz_${selectedTema.toLowerCase()}.xlsx`;
    } else if (gameType === 'verdadeiro_falso') {
      wsData = [
        ["Afirmação", "Resposta (VERDADEIRO ou FALSO)"],
        ["O Sol é uma estrela.", "VERDADEIRO"],
        ["A Terra é plana.", "FALSO"]
      ];
      filename = `modelo_verdadeiro_falso_${selectedTema.toLowerCase()}.xlsx`;
    } else if (gameType === 'forca') {
      wsData = [
        ["Palavra Secreta", "Dica"],
        ["MATEMATICA", "Estudo dos números e cálculos"],
        ["HISTORIA", "Estudo do passado e civilizações"]
      ];
      filename = `modelo_forca_${selectedTema.toLowerCase()}.xlsx`;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Questões");
    XLSX.writeFile(wb, filename);
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) {
          alert('A planilha está vazia ou sem dados.');
          return;
        }

        let count = 0;
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0 || !row[0]) continue;

          if (activeQuestionGame === 'quiz' && row.length >= 6) {
            await addDoc(collection(db as any, 'banco_questoes'), {
              tema: selectedTema,
              tipo: 'quiz',
              question: String(row[0] || '').trim(),
              options: [String(row[1] || ''), String(row[2] || ''), String(row[3] || ''), String(row[4] || '')],
              correctIndex: Number(row[5]) || 0,
              criadoEm: serverTimestamp()
            });
            count++;
          } else if (activeQuestionGame === 'verdadeiro_falso' && row.length >= 2) {
            const respStr = String(row[1] || '').trim().toUpperCase();
            const isTrue = respStr === 'VERDADEIRO' || respStr === 'TRUE' || respStr === '1';
            await addDoc(collection(db as any, 'banco_questoes'), {
              tema: selectedTema,
              tipo: 'verdadeiro_falso',
              statement: String(row[0] || '').trim(),
              isTrue,
              criadoEm: serverTimestamp()
            });
            count++;
          } else if (activeQuestionGame === 'forca' && row.length >= 2) {
            await addDoc(collection(db as any, 'banco_questoes'), {
              tema: selectedTema,
              tipo: 'forca',
              word: String(row[0] || '').trim().toUpperCase(),
              hint: String(row[1] || '').trim(),
              criadoEm: serverTimestamp()
            });
            count++;
          }
        }

        alert(`Importação em lote concluída! ${count} questões adicionadas ao tema ${selectedTema}.`);
        e.target.value = '';
      } catch (err: any) {
        console.error("Erro na importação em lote:", err);
        alert('Erro ao processar planilha Excel: ' + (err?.message || err));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#0b4d32] to-[#042417] min-h-screen text-white">
        <div className="bg-red-500/20 border border-red-500/40 p-6 rounded-3xl max-w-md space-y-4">
          <h2 className="text-xl font-black text-red-300">Firebase não configurado</h2>
          <p className="text-xs text-emerald-200">Preencha as variáveis de ambiente no arquivo .env ou nas configurações do Vercel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-8 w-full max-w-7xl mx-auto py-6 px-4 bg-gradient-to-b from-[#0b4d32] via-[#073824] to-[#042417] min-h-screen text-white rounded-3xl shadow-2xl my-4 border border-emerald-600/40">
      
      {/* Top Yellow Header Banner */}
      <div className="flex flex-col items-center space-y-4">
        <div className="w-full max-w-md bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-center py-4 px-8 rounded-2xl shadow-xl border-2 border-yellow-200 tracking-wider text-xl uppercase transform hover:scale-102 transition">
          PAINEL DO PROFESSSOR
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenCreate}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-lime-400 to-emerald-400 hover:from-lime-300 hover:to-emerald-300 text-slate-950 font-black text-sm shadow-xl transition flex items-center space-x-2 border border-lime-200"
          >
            <Plus className="w-5 h-5" />
            <span>CRIAR SALA</span>
          </button>

          <button
            onClick={onLogout}
            className="px-4 py-3 rounded-2xl bg-slate-950/80 border border-emerald-500/40 text-emerald-300 font-bold transition text-sm flex items-center space-x-1.5 hover:bg-slate-900"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* 1. TEMAS SECTION */}
      <div className="max-w-4xl mx-auto w-full bg-[#052c1e] border-2 border-emerald-500/40 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-emerald-800 gap-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              TEMAS &bull; Banco de Questões
            </h3>
          </div>
          <form onSubmit={handleCreateTema} className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Novo tema (ex: GEOGRAFIA)"
              value={novoTemaInput}
              onChange={(e) => setNovoTemaInput(e.target.value)}
              className="bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-emerald-800 focus:outline-none font-bold uppercase"
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase"
            >
              + INSERIR TEMA
            </button>
          </form>
        </div>

        <p className="text-xs text-emerald-200/80">
          Clique em um tema abaixo para abri-lo e gerenciar as questões (Quiz, V/F, Forca) e carregar planilhas em Excel.
        </p>

        <div className="flex flex-wrap gap-3">
          {temasList.map(tema => (
            <div key={tema} className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedTema(tema);
                  setShowQuestionModal(true);
                }}
                className="px-5 py-3 rounded-2xl font-black text-xs transition border bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 border-amber-200 shadow-xl transform hover:scale-105 flex items-center space-x-2"
              >
                <span>📂 {tema}</span>
                <span className="text-[10px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-lg">Abrir Tema ➔</span>
              </button>
              <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditTemaModal(true);
                    setTemaParaEditar(tema);
                    setTemaEditadoNome(tema);
                  }}
                  className="p-2 rounded-xl bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 text-xs"
                  title="Editar Tema"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTema(tema);
                  }}
                  className="p-2 rounded-xl bg-red-600/30 text-red-300 hover:bg-red-600/50 text-xs"
                  title="Apagar Tema"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SALAS E SENHAS Header Banner */}
      <div className="max-w-md mx-auto w-full text-center mt-2">
        <div className="bg-gradient-to-r from-lime-300 to-emerald-400 text-slate-950 font-black py-3 px-6 rounded-2xl shadow-xl border-2 border-lime-100 tracking-wider uppercase text-lg">
          SALAS E SENHAS
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-emerald-300 font-bold animate-pulse">Carregando salas em tempo real...</div>
      ) : error ? (
        <div className="text-center py-20 text-red-400 font-bold">{error}</div>
      ) : salas.length === 0 ? (
        <div className="text-center py-16 bg-[#042417] border border-emerald-600/40 rounded-3xl text-emerald-300/60 max-w-xl mx-auto w-full">
          Nenhuma sala cadastrada. Clique em "CRIAR SALA" acima para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 max-w-5xl mx-auto w-full">
          {salas.map((sala) => {
            const cadeiras = sala.cadeiras || [];
            const ocupadas = cadeiras.filter((c: any) => c.ocupada).length;
            const total = cadeiras.length;
            const jogoLiberado = sala.jogoLiberado === true;
            const jogoAtivo = sala.jogoAtivo || 'quiz';

            return (
              <div key={sala.id} className="bg-[#052c1e] border-2 border-emerald-500/50 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
                
                {/* Sala Info & Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-emerald-800/60">
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-2xl font-black text-white">{sala.nome}</h3>
                      <span className="text-xs font-black text-amber-400 bg-slate-950 px-3 py-1 rounded-xl border border-amber-400/30">
                        PIN: {sala.pin || '1234'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-300/80 font-bold mt-1">
                      Ocupação: <strong className="text-amber-400">{ocupadas} de {total} cadeiras</strong>
                    </p>
                  </div>



                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLiberarTodas(sala.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-cyan-600/30 border border-cyan-500/50 hover:bg-cyan-600/50 text-cyan-200 font-bold text-xs transition flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Limpar Cadeiras</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(sala);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-blue-600/30 border border-blue-500/50 hover:bg-blue-600/50 text-blue-200 font-bold text-xs transition flex items-center space-x-1"
                      title="Editar Sala"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSala(sala.id, sala.nome);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-red-600/30 border border-red-500/50 hover:bg-red-600/50 text-red-200 font-bold text-xs transition flex items-center space-x-1"
                      title="Apagar Sala"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Apagar</span>
                    </button>
                  </div>
                </div>

                {/* JOGO DAS CORES - PAINEL DO PROFESSOR */}
                <div className="w-full p-5 bg-slate-950/90 border-2 border-purple-500/50 rounded-3xl space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-purple-300 uppercase tracking-wider">
                        🎨 JOGO DAS CORES &bull; Escolha a Cor da Rodada
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleJogoCores(sala.id, sala.jogoCoresLiberado)}
                      className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase transition shadow ${sala.jogoCoresLiberado ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}
                    >
                      {sala.jogoCoresLiberado ? 'Liberado para Alunos 🔓' : 'Trancado 🔒'}
                    </button>
                  </div>

                  <p className="text-xs text-purple-200/80">
                    Clique em uma cor abaixo. Assim que clicar, a cor correta é definida e liberada para os alunos.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {[
                      { key: 'vermelho', label: 'VERMELHO', color: 'bg-red-600' },
                      { key: 'azul', label: 'AZUL', color: 'bg-blue-600' },
                      { key: 'amarelo', label: 'AMARELO', color: 'bg-yellow-400 text-slate-950' },
                      { key: 'verde', label: 'VERDE', color: 'bg-emerald-600' },
                      { key: 'laranja', label: 'LARANJA', color: 'bg-orange-500' },
                      { key: 'roxo', label: 'ROXO', color: 'bg-purple-600' }
                    ].map(c => (
                      <button
                        key={c.key}
                        onClick={() => handleSetCorRodada(sala.id, c.key)}
                        className={`p-4 rounded-2xl font-black text-xs border-2 transition transform hover:scale-105 shadow-lg ${sala.corRodada === c.key ? 'border-white ring-4 ring-white/50 scale-105' : 'border-transparent'} ${c.color}`}
                      >
                        {sala.corRodada === c.key ? `✓ ${c.label}` : c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* JOGO DO QUIZ - PAINEL DO PROFESSOR */}
                <div className="w-full p-5 bg-slate-950/90 border-2 border-blue-500/50 rounded-3xl space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-blue-300 uppercase tracking-wider">
                        ❓ JOGO DO QUIZ &bull; Escolher e Liberar Pergunta (Uma por Uma)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleJogoQuiz(sala.id, sala.jogoQuizLiberado)}
                      className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase transition shadow ${sala.jogoQuizLiberado ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}
                    >
                      {sala.jogoQuizLiberado ? 'Liberado para Alunos 🔓' : 'Trancado 🔒'}
                    </button>
                  </div>

                  <p className="text-xs text-blue-200/80">
                    Pergunta ativa atual: <strong className="text-amber-400 font-mono text-sm">{sala.perguntaAtivaQuiz?.question || 'Nenhuma pergunta liberada ainda'}</strong>
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-300 mb-1">Selecionar Pergunta de Quiz para Liberar:</label>
                      <select
                        onChange={(e) => {
                          const qId = e.target.value;
                          if (qId) {
                            const foundQ = questoesBanco.find(q => q.id === qId);
                            if (foundQ) {
                              handleLiberarPerguntaQuiz(sala.id, foundQ);
                            }
                          }
                          e.target.value = '';
                        }}
                        className="w-full bg-slate-900 border border-blue-500/40 rounded-xl px-3 py-2 text-xs text-white font-bold uppercase focus:outline-none"
                      >
                        <option value="">-- Escolher Pergunta de Quiz e Liberar --</option>
                        {questoesBanco.filter(q => q.tipo === 'quiz').map(q => (
                          <option key={q.id} value={q.id}>
                            [{q.tema}] {q.question}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* JOGO V/F - PAINEL DO PROFESSOR */}
                <div className="w-full p-5 bg-slate-950/90 border-2 border-teal-500/50 rounded-3xl space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-teal-300 uppercase tracking-wider">
                        ✅ JOGO V/F &bull; Escolher e Liberar Afirmação (Uma por Uma)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleJogoVF(sala.id, sala.jogoVFLiberado)}
                      className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase transition shadow ${sala.jogoVFLiberado ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}
                    >
                      {sala.jogoVFLiberado ? 'Liberado para Alunos 🔓' : 'Trancado 🔒'}
                    </button>
                  </div>

                  <p className="text-xs text-teal-200/80">
                    Afirmação ativa atual: <strong className="text-amber-400 font-mono text-sm">{sala.afirmacaoAtivaVF?.statement || 'Nenhuma afirmação V/F liberada ainda'}</strong>
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-teal-300 mb-1">Selecionar Afirmação V/F para Liberar:</label>
                      <select
                        onChange={(e) => {
                          const qId = e.target.value;
                          if (qId) {
                            const foundQ = questoesBanco.find(q => q.id === qId);
                            if (foundQ) {
                              handleLiberarAfirmacaoVF(sala.id, foundQ);
                            }
                          }
                          e.target.value = '';
                        }}
                        className="w-full bg-slate-900 border border-teal-500/40 rounded-xl px-3 py-2 text-xs text-white font-bold uppercase focus:outline-none"
                      >
                        <option value="">-- Escolher Afirmação V/F e Liberar --</option>
                        {questoesBanco.filter(q => q.tipo === 'verdadeiro_falso').map(q => (
                          <option key={q.id} value={q.id}>
                            [{q.tema}] {q.statement} ({q.isTrue ? 'VERDADEIRO' : 'FALSO'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* JOGO DO QUADRADO - PAINEL DO PROFESSOR */}
                <div className="w-full p-5 bg-slate-950/90 border-2 border-emerald-500/50 rounded-3xl space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-emerald-300 uppercase tracking-wider">
                        🟩 JOGO DO QUADRADO &bull; Escolha o Quadrado Secreto
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleJogoQuadrado(sala.id, sala.jogoQuadradoLiberado)}
                      className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase transition shadow ${sala.jogoQuadradoLiberado ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}
                    >
                      {sala.jogoQuadradoLiberado ? 'Liberado para Alunos 🔓' : 'Trancado 🔒'}
                    </button>
                  </div>

                  {(() => {
                    const activeCount = (sala.cadeiras || []).filter((c: any) => c.ocupada).length;
                    const gridSize = Math.max(3, activeCount + 2);

                    return (
                      <div className="space-y-3">
                        <p className="text-xs text-emerald-200/80">
                          Alunos ativos na sala: <strong className="text-amber-400">{activeCount}</strong> &bull;
                          Tabela proporcional: <strong className="text-amber-400">{gridSize} Quadrados</strong>
                        </p>

                        <div>
                          <label className="block text-[11px] font-bold text-emerald-300 mb-1">Escolher o seu Quadrado Secreto (Professor):</label>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {Array.from({ length: gridSize }).map((_, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSetSecretQuadrado(sala.id, idx)}
                                className={`p-3 rounded-xl font-black text-xs border-2 transition ${sala.secretQuadradoProfessor === idx ? 'bg-amber-400 text-slate-950 border-white ring-4 ring-white/40 scale-105' : 'bg-slate-900 text-emerald-300 border-emerald-500/40 hover:bg-emerald-950'}`}
                              >
                                {sala.secretQuadradoProfessor === idx ? `✓ Quadrado #${idx + 1}` : `Quadrado #${idx + 1}`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {sala.ultimoResultadoQuadrado && (
                          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold">
                            {sala.ultimoResultadoQuadrado}
                          </div>
                        )}

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleProcessarRodadaQuadrado(sala.id)}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 text-slate-950 font-black text-xs uppercase shadow-xl transition"
                          >
                            🚀 Revelar Quadrado & Processar Rodada
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* JOGO DA FORCA - PAINEL DO PROFESSOR */}
                <div className="w-full p-5 bg-slate-950/90 border-2 border-amber-500/50 rounded-3xl space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-amber-300 uppercase tracking-wider">
                        🔤 JOGO DA FORCA &bull; Escolher e Liberar Palavra (Uma por Uma)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleJogoForca(sala.id, sala.jogoForcaLiberado)}
                      className={`px-4 py-1.5 rounded-xl font-black text-xs uppercase transition shadow ${sala.jogoForcaLiberado ? 'bg-emerald-500 text-slate-950' : 'bg-red-600 text-white'}`}
                    >
                      {sala.jogoForcaLiberado ? 'Liberado para Alunos 🔓' : 'Trancado 🔒'}
                    </button>
                  </div>

                  <p className="text-xs text-amber-200/80">
                    Palavra ativa atual: <strong className="text-amber-400 font-mono text-sm">{sala.palavraAtivaForca || 'Nenhuma palavra liberada ainda'}</strong>
                    {sala.dicaAtivaForca && <span> (Dica: {sala.dicaAtivaForca})</span>}
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-amber-300 mb-1">Selecionar Palavra do Banco de Questões para Liberar:</label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            const [w, h] = val.split('|||');
                            handleLiberarPalavraForca(sala.id, w, h);
                          }
                          e.target.value = '';
                        }}
                        className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white font-bold uppercase focus:outline-none"
                      >
                        <option value="">-- Escolher do Banco de Questões e Liberar --</option>
                        {questoesBanco.filter(q => q.tipo === 'forca').map(q => (
                          <option key={q.id} value={`${q.word}|||${q.hint || ''}`}>
                            [{q.tema}] {q.word} - Dica: {q.hint}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Chairs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                  {cadeiras.map((c: any) => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center space-y-1.5 transition ${c.ocupada ? 'bg-red-950/90 border-red-500 text-red-200 shadow-lg' : 'bg-slate-950 border-emerald-900/60 text-emerald-400'}`}
                    >
                      <div className="flex items-center space-x-1">
                        <Armchair className={`w-4 h-4 ${c.ocupada ? 'text-red-400' : 'text-emerald-500'}`} />
                        <span className="text-xs font-black">#{c.id}</span>
                      </div>

                      {c.ocupada ? (
                        <div className="w-full space-y-1">
                          <span className="text-lg block">{c.avatar || '🦁'}</span>
                          <span className="text-[10px] font-black truncate block text-amber-300 max-w-full">
                            {c.nomeAluno}
                          </span>
                          <button
                            onClick={() => handleKickStudent(sala.id, c.id)}
                            className="mt-1 w-full py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[9px] font-bold"
                          >
                            Expulsar
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-emerald-500/60 font-bold py-1">Livre</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Placar e Ranking da Sala */}
                <div className="mt-8 pt-6 border-t border-emerald-900/60 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h4 className="text-lg font-black text-white">Placar e Ranking de Alunos</h4>
                  </div>

                  {ocupadas === 0 ? (
                    <div className="text-xs text-emerald-300/60 bg-slate-950 p-4 rounded-2xl border border-emerald-900/40 text-center">
                      Nenhum aluno sentado no momento para exibir o ranking.
                    </div>
                  ) : (
                    <div className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-emerald-900/60 text-[11px] font-black uppercase text-emerald-300">
                            <th className="py-2 px-3">Posição</th>
                            <th className="py-2 px-3">Aluno</th>
                            <th className="py-2 px-3">Cadeira</th>
                            <th className="py-2 px-3 text-right">Pontuação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-900/40 text-xs font-semibold">
                          {[...cadeiras]
                            .filter((c: any) => c.ocupada && c.nomeAluno)
                            .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
                            .map((c: any, index: number) => {
                              const medalColors = index === 0 ? 'bg-amber-400 text-slate-950 font-black' : index === 1 ? 'bg-slate-300 text-slate-950 font-black' : index === 2 ? 'bg-amber-700 text-white font-black' : 'bg-slate-900 text-emerald-300';
                              return (
                                <tr key={c.id} className="hover:bg-[#052c1e]/50 transition">
                                  <td className="py-3 px-3">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${medalColors}`}>
                                      {index + 1}º
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 flex items-center space-x-2">
                                    <span className="text-base">{c.avatar || '🦁'}</span>
                                    <span className="text-white font-bold">{c.nomeAluno}</span>
                                  </td>
                                  <td className="py-3 px-3 text-emerald-300 font-mono">
                                    Cadeira #{c.id}
                                  </td>
                                  <td className="py-3 px-3 text-right font-black text-amber-400 text-sm">
                                    {c.score || 0} pts
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Sala */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-[#052c1e] border border-emerald-500/40 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-white text-center">
              {editingId ? 'Editar Sala de Cadeiras' : 'Criar Nova Sala de Cadeiras'}
            </h3>

            <form onSubmit={handleSaveSala} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5">Nome da Sala</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Sala de Geografia - Turma A"
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-3 text-white placeholder-emerald-900 focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5">PIN da Sala (Senha)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-3 text-center text-xl tracking-widest text-white placeholder-emerald-900 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1.5">Quantidade de Cadeiras (1 a 60)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  required
                  value={numCadeiras}
                  onChange={(e) => setNumCadeiras(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-950 border border-emerald-500/30 text-emerald-300 font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-xl transition"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Banco de Questões por Tema (Abriu o Tema) */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#052c1e] border-2 border-emerald-500/50 rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl space-y-8 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-emerald-800">
              <div>
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Tema: {selectedTema}</span>
                <h3 className="text-2xl font-black text-white mt-0.5">
                  BANCO DE QUESTÕES & PLANILHAS EXCEL
                </h3>
              </div>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="px-5 py-2 rounded-xl bg-red-600/30 border border-red-500/50 text-red-200 font-bold text-xs hover:bg-red-600/50"
              >
                Fechar Tema ✕
              </button>
            </div>

            {/* Render Quiz, V/F, and Forca sections */}
            <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
              
              {/* 1. QUIZ SECTION */}
              <div className="bg-slate-950/80 p-5 rounded-3xl border border-blue-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-900/60">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    <h4 className="text-sm font-black text-blue-300 uppercase tracking-wider">QUIZ</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuestionGame('quiz');
                        handleDownloadTemplate('quiz');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs flex items-center space-x-1 shadow"
                    >
                      <span>📊 Baixar Modelo Quiz</span>
                    </button>
                    <label className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer flex items-center space-x-1 shadow">
                      <span>📂 Importar Lotes Quiz</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => {
                          setActiveQuestionGame('quiz');
                          handleBulkImport(e);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* List of Quiz questions */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-emerald-300">Questões de Quiz cadastradas neste tema:</span>
                  {questoesBanco.filter(q => q.tema === selectedTema && q.tipo === 'quiz').length === 0 ? (
                    <div className="text-xs text-emerald-300/50 text-center py-4 bg-[#052c1e] rounded-xl">Nenhuma questão de Quiz cadastrada ainda.</div>
                  ) : (
                    questoesBanco.filter(q => q.tema === selectedTema && q.tipo === 'quiz').map(q => (
                      <div key={q.id} className="flex items-center justify-between bg-[#052c1e] p-3 rounded-xl border border-emerald-800 text-xs">
                        <div className="truncate pr-4">
                          <strong className="text-amber-400 block">{q.question}</strong>
                          <span className="text-[10px] text-emerald-300/70">Opções: {q.options?.join(', ')} (Correta: Opção {(q.correctIndex ?? 0) + 1})</span>
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300"
                          title="Apagar Questão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 2. V/F SECTION */}
              <div className="bg-slate-950/80 p-5 rounded-3xl border border-emerald-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-900/60">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                    <h4 className="text-sm font-black text-emerald-300 uppercase tracking-wider">VERDADEIRO OU FALSO (V/F)</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuestionGame('verdadeiro_falso');
                        handleDownloadTemplate('verdadeiro_falso');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs flex items-center space-x-1 shadow"
                    >
                      <span>📊 Baixar Modelo V/F</span>
                    </button>
                    <label className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer flex items-center space-x-1 shadow">
                      <span>📂 Importar Lotes V/F</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => {
                          setActiveQuestionGame('verdadeiro_falso');
                          handleBulkImport(e);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* List of V/F */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-emerald-300">Afirmações de V/F cadastradas neste tema:</span>
                  {questoesBanco.filter(q => q.tema === selectedTema && q.tipo === 'verdadeiro_falso').length === 0 ? (
                    <div className="text-xs text-emerald-300/50 text-center py-4 bg-[#052c1e] rounded-xl">Nenhuma afirmação de V/F cadastrada ainda.</div>
                  ) : (
                    questoesBanco.filter(q => q.tema === selectedTema && q.tipo === 'verdadeiro_falso').map(q => (
                      <div key={q.id} className="flex items-center justify-between bg-[#052c1e] p-3 rounded-xl border border-emerald-800 text-xs">
                        <div className="truncate pr-4">
                          <strong className="text-amber-400 block">{q.statement}</strong>
                          <span className="text-[10px] text-emerald-300/70">Resposta: {q.isTrue ? 'VERDADEIRO' : 'FALSO'}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300"
                          title="Apagar Questão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. FORCA SECTION */}
              <div className="bg-slate-950/80 p-5 rounded-3xl border border-amber-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-900/60">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                    <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider">JOGO DA FORCA</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveQuestionGame('forca');
                        handleDownloadTemplate('forca');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs flex items-center space-x-1 shadow"
                    >
                      <span>📊 Baixar Modelo Forca</span>
                    </button>
                    <label className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer flex items-center space-x-1 shadow">
                      <span>📂 Importar Lotes Forca</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => {
                          setActiveQuestionGame('forca');
                          handleBulkImport(e);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* List of Forca */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-emerald-300">Palavras da Forca cadastradas neste tema:</span>
                  {questoesBanco.filter(q => q.tema === selectedTema && q.tipo === 'forca').length === 0 ? (
                    <div className="text-xs text-emerald-300/50 text-center py-4 bg-[#052c1e] rounded-xl">Nenhuma palavra de Forca cadastrada ainda.</div>
                  ) : (
                    questoesBanco.filter(q => q.tema === selectedTema && q.tipo === 'forca').map(q => (
                      <div key={q.id} className="flex items-center justify-between bg-[#052c1e] p-3 rounded-xl border border-emerald-800 text-xs">
                        <div className="truncate pr-4">
                          <strong className="text-amber-400 block font-mono">{q.word}</strong>
                          <span className="text-[10px] text-emerald-300/70">Dica: {q.hint}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300"
                          title="Apagar Questão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div className="pt-4 border-t border-emerald-800 text-center">
              <button
                onClick={() => setShowQuestionModal(false)}
                className="px-8 py-3 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs uppercase shadow-xl hover:bg-amber-300 transition"
              >
                Concluir e Fechar Tema ✕
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Editar Tema */}
      {editTemaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-[#052c1e] border border-emerald-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h4 className="text-lg font-black text-white text-center">Editar Tema</h4>
            <form onSubmit={handleUpdateTema} className="space-y-3">
              <input
                type="text"
                required
                value={temaEditadoNome}
                onChange={(e) => setTemaEditadoNome(e.target.value)}
                className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-white font-bold uppercase focus:outline-none"
              />
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setEditTemaModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs uppercase"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Apagar Tema (Confirmação) */}
      {deleteTemaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-[#052c1e] border border-red-500/50 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <h4 className="text-lg font-black text-white">Apagar Tema</h4>
            <p className="text-xs text-emerald-200">
              Deseja realmente apagar o tema <strong className="text-amber-400">"{temaParaDeletar}"</strong> e todas as suas questões do banco?
            </p>
            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTemaModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTema}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase shadow-lg"
              >
                Sim, Apagar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
