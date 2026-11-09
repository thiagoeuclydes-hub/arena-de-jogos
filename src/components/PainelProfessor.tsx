import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Armchair, ArrowLeft, RefreshCw, LogOut, Lock, Unlock, Trophy, Gamepad2, Settings, BookOpen, Layers } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

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
  const [temasList, setTemasList] = useState<string[]>(['BRASIL', 'ALAGOAS', 'CIENCIAS', 'FILME: JACK', 'FILME VINGADORES']);
  const [selectedTema, setSelectedTema] = useState('BRASIL');
  const [novoTemaInput, setNovoTemaInput] = useState('');
  const [editTemaModal, setEditTemaModal] = useState(false);
  const [temaParaEditar, setTemaParaEditar] = useState('');
  const [temaEditadoNome, setTemaEditadoNome] = useState('');

  // Form question fields
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrectIdx, setQCorrectIdx] = useState(0);
  const [qIsTrue, setQIsTrue] = useState(true);
  const [qWord, setQWord] = useState('');
  const [qHint, setQHint] = useState('');

  const [questoesBanco, setQuestoesBanco] = useState<any[]>([]);

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
      setTemasList([...temasList, t]);
      setSelectedTema(t);
    }
    setNovoTemaInput('');
  };

  const handleUpdateTema = (e: React.FormEvent) => {
    e.preventDefault();
    if (!temaEditadoNome.trim()) return;
    const novo = temaEditadoNome.trim().toUpperCase();
    setTemasList(temasList.map(t => t === temaParaEditar ? novo : t));
    if (selectedTema === temaParaEditar) {
      setSelectedTema(novo);
    }
    setEditTemaModal(false);
    setTemaParaEditar('');
    setTemaEditadoNome('');
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

  const handleDownloadTemplate = () => {
    let csvContent = "";
    let filename = "";
    if (activeQuestionGame === 'quiz') {
      csvContent = "pergunta,opcao1,opcao2,opcao3,opcao4,indice_correto\n\"Qual a capital do Brasil?\",\"Rio de Janeiro\",\"São Paulo\",\"Brasília\",\"Salvador\",2\n\"Qual o maior planeta?\",\"Marte\",\"Júpiter\",\"Vênus\",\"Saturno\",1";
      filename = `modelo_quiz_${selectedTema.toLowerCase()}.csv`;
    } else if (activeQuestionGame === 'verdadeiro_falso') {
      csvContent = "afirmacao,resposta\n\"O Sol é uma estrela.\",true\n\"A Terra é plana.\",false";
      filename = `modelo_verdadeiro_falso_${selectedTema.toLowerCase()}.csv`;
    } else if (activeQuestionGame === 'forca') {
      csvContent = "palavra,dica\n\"MATEMATICA\",\"Estudo dos números\"\n\"HISTORIA\",\"Estudo do passado\"";
      filename = `modelo_forca_${selectedTema.toLowerCase()}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          alert('Arquivo CSV vazio ou inválido.');
          return;
        }

        let count = 0;
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          const cleanVals = match.map(v => v.replace(/^"|"$/g, '').trim());

          if (activeQuestionGame === 'quiz' && cleanVals.length >= 6) {
            await addDoc(collection(db as any, 'banco_questoes'), {
              tema: selectedTema,
              tipo: 'quiz',
              question: cleanVals[0],
              options: [cleanVals[1], cleanVals[2], cleanVals[3], cleanVals[4]],
              correctIndex: Number(cleanVals[5]) || 0,
              criadoEm: serverTimestamp()
            });
            count++;
          } else if (activeQuestionGame === 'verdadeiro_falso' && cleanVals.length >= 2) {
            await addDoc(collection(db as any, 'banco_questoes'), {
              tema: selectedTema,
              tipo: 'verdadeiro_falso',
              statement: cleanVals[0],
              isTrue: cleanVals[1].toLowerCase() === 'true',
              criadoEm: serverTimestamp()
            });
            count++;
          } else if (activeQuestionGame === 'forca' && cleanVals.length >= 2) {
            await addDoc(collection(db as any, 'banco_questoes'), {
              tema: selectedTema,
              tipo: 'forca',
              word: cleanVals[0].toUpperCase(),
              hint: cleanVals[1],
              criadoEm: serverTimestamp()
            });
            count++;
          }
        }

        alert(`Importação em lote concluída! ${count} questões adicionadas ao tema ${selectedTema}.`);
        e.target.value = '';
      } catch (err: any) {
        console.error("Erro na importação em lote:", err);
        alert('Erro ao processar arquivo CSV: ' + (err?.message || err));
      }
    };
    reader.readAsText(file);
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

      {/* Modal Banco de Questões por Tema */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#052c1e] border-2 border-emerald-500/50 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-emerald-800">
              <div>
                <span className="text-xs font-black text-amber-400 uppercase tracking-widest">Banco de Questões</span>
                <h3 className="text-2xl font-black text-white mt-0.5">
                  Gerenciar &bull; {activeQuestionGame === 'quiz' ? 'Quiz' : activeQuestionGame === 'verdadeiro_falso' ? 'Verdadeiro ou Falso' : 'Jogo da Forca'}
                </h3>
              </div>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-950 border border-emerald-500/30 text-emerald-300 font-bold text-xs"
              >
                Fechar ✕
              </button>
            </div>

            {/* Temas Selector & Manager */}
            <div className="space-y-4 bg-slate-950/80 p-5 rounded-2xl border border-emerald-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-black uppercase tracking-wider text-emerald-300">Tema Selecionado:</label>
                  <span className="text-xs font-black bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg">{selectedTema}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowQuestionModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs hover:bg-slate-800"
                  >
                    Fechar ✕
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-emerald-900/60">
                <form onSubmit={handleCreateTema} className="flex items-center space-x-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Novo tema (ex: HISTORIA)"
                    value={novoTemaInput}
                    onChange={(e) => setNovoTemaInput(e.target.value)}
                    className="bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-xs text-white placeholder-emerald-800 focus:outline-none font-bold"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs"
                  >
                    + Criar Tema
                  </button>
                </form>

                {/* Excel / CSV Templates & Bulk Import */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs flex items-center space-x-1"
                    title="Baixar modelo em CSV/Excel para carregar em lotes"
                  >
                    <span>📊 Baixar Modelo Excel</span>
                  </button>

                  <label className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer flex items-center space-x-1">
                    <span>📂 Importar Lotes</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleBulkImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {temasList.map(tema => (
                  <div key={tema} className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTema(tema)}
                      className={`px-4 py-2 rounded-xl font-black text-xs transition border ${selectedTema === tema ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg scale-105' : 'bg-[#052c1e] text-emerald-300 border-emerald-800 hover:bg-[#073824]'}`}
                    >
                      {tema}
                    </button>
                    {['BRASIL', 'ALAGOAS', 'CIENCIAS', 'FILME: JACK', 'FILME VINGADORES'].indexOf(tema) === -1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditTemaModal(true);
                          setTemaParaEditar(tema);
                          setTemaEditadoNome(tema);
                        }}
                        className="p-1.5 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 text-[10px]"
                        title="Editar Tema"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Question Form */}
            <form onSubmit={handleAddQuestion} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-emerald-900/60">
              <h4 className="text-sm font-black text-amber-400">Adicionar Nova Questão para o tema: <span className="underline">{selectedTema}</span></h4>

              {activeQuestionGame === 'forca' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-emerald-300 mb-1">Palavra Secreta</label>
                    <input
                      type="text"
                      required
                      value={qWord}
                      onChange={(e) => setQWord(e.target.value)}
                      placeholder="Ex: GEOGRAFIA"
                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-white placeholder-emerald-900 font-mono uppercase focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-emerald-300 mb-1">Dica</label>
                    <input
                      type="text"
                      required
                      value={qHint}
                      onChange={(e) => setQHint(e.target.value)}
                      placeholder="Ex: Estudo da Terra e mapas"
                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-white placeholder-emerald-900 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {activeQuestionGame === 'verdadeiro_falso' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-emerald-300 mb-1">Afirmação / Declaração</label>
                    <input
                      type="text"
                      required
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder="Ex: Alagoas é banhada pelo Oceano Atlântico."
                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-white placeholder-emerald-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-emerald-300 mb-1">Resposta Correta</label>
                    <select
                      value={String(qIsTrue)}
                      onChange={(e) => setQIsTrue(e.target.value === 'true')}
                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none"
                    >
                      <option value="true">Verdadeiro</option>
                      <option value="false">Falso</option>
                    </select>
                  </div>
                </div>
              )}

              {activeQuestionGame === 'quiz' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-emerald-300 mb-1">Pergunta do Quiz</label>
                    <input
                      type="text"
                      required
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder="Ex: Qual a capital de Alagoas?"
                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-white placeholder-emerald-900 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {qOptions.map((opt, oIdx) => (
                      <div key={oIdx}>
                        <label className="block text-[10px] font-bold text-emerald-400 mb-1">Opção {oIdx + 1} {oIdx === qCorrectIdx ? '(Correta)' : ''}</label>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...qOptions];
                            newOpts[oIdx] = e.target.value;
                            setQOptions(newOpts);
                          }}
                          placeholder={`Opção ${oIdx + 1}`}
                          className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-emerald-300 mb-1">Índice da Resposta Correta (0 a 3)</label>
                    <select
                      value={qCorrectIdx}
                      onChange={(e) => setQCorrectIdx(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-white font-bold focus:outline-none"
                    >
                      <option value={0}>Opção 1</option>
                      <option value={1}>Opção 2</option>
                      <option value={2}>Opção 3</option>
                      <option value={3}>Opção 4</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase shadow-lg transition"
              >
                + Adicionar ao Banco de Questões
              </button>
            </form>

            {/* List of existing questions in this theme */}
            <div className="space-y-3 bg-slate-950/80 p-5 rounded-2xl border border-emerald-900 max-h-64 overflow-y-auto">
              <h4 className="text-xs font-black uppercase text-emerald-300">Questões cadastradas no tema "{selectedTema}":</h4>
              {questoesBanco.filter(q => q.tema === selectedTema && q.tipo === activeQuestionGame).length === 0 ? (
                <div className="text-xs text-emerald-300/50 text-center py-6">Nenhuma questão cadastrada neste tema ainda.</div>
              ) : (
                <div className="space-y-2">
                  {questoesBanco
                    .filter(q => q.tema === selectedTema && q.tipo === activeQuestionGame)
                    .map(q => (
                      <div key={q.id} className="flex items-center justify-between bg-[#052c1e] p-3 rounded-xl border border-emerald-800 text-xs">
                        <div className="truncate pr-4">
                          <strong className="text-amber-400 block">{q.question || q.statement || q.word}</strong>
                          <span className="text-[10px] text-emerald-300/70">{q.hint || (q.options ? q.options.join(', ') : (q.isTrue ? 'Verdadeiro' : 'Falso'))}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300"
                          title="Apagar Questão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
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

    </div>
  );
};
