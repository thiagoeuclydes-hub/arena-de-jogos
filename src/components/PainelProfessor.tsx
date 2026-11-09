import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Armchair, ArrowLeft, RefreshCw, LogOut, CheckCircle2, Play, Lock, Unlock, Gamepad2, Trophy } from 'lucide-react';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

interface PainelProfessorProps {
  onLogout: () => void;
}

export const PainelProfessor: React.FC<PainelProfessorProps> = ({ onLogout }) => {
  const [salas, setSalas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('1234');
  const [numCadeiras, setNumCadeiras] = useState(20);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setError('Firebase não configurado. Preencha as variáveis de ambiente em .env');
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'salas'),
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

    return () => unsubscribe();
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
          return { id: i + 1, ocupada: false, nomeAluno: '', avatar: '' };
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
          avatar: ''
        }));

        await addDoc(collection(db as any, 'salas'), {
          nome: nome.trim(),
          pin: pin.trim() || '1234',
          cadeiras,
          jogoLiberado: false,
          jogoAtivo: 'quiz',
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
    if (!db) return;
    if (confirm(`Deseja realmente apagar a sala "${nomeSala}"?`)) {
      try {
        await deleteDoc(doc(db as any, 'salas', id));
      } catch (err) {
        console.error("Erro ao apagar sala:", err);
        alert('Erro ao apagar sala.');
      }
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

  const handleKickStudent = async (salaId: string, chairId: number) => {
    if (!db) return;
    try {
      const sala = salas.find(s => s.id === salaId);
      if (!sala) return;

      const updatedCadeiras = sala.cadeiras.map((c: any) => {
        if (c.id === chairId) {
          return { id: c.id, ocupada: false, nomeAluno: '', avatar: '' };
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
    if (confirm('Deseja liberar todas as cadeiras desta sala?')) {
      try {
        const sala = salas.find(s => s.id === salaId);
        if (!sala) return;

        const updatedCadeiras = sala.cadeiras.map((c: any) => ({
          id: c.id,
          ocupada: false,
          nomeAluno: '',
          avatar: ''
        }));

        await updateDoc(doc(db as any, 'salas', salaId), {
          cadeiras: updatedCadeiras
        });
      } catch (err) {
        console.error("Erro ao liberar todas as cadeiras:", err);
      }
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-500/20 border border-red-500/40 p-6 rounded-3xl max-w-md space-y-4">
          <h2 className="text-xl font-black text-red-300">Firebase não configurado</h2>
          <p className="text-xs text-cyan-200">Preencha as variáveis de ambiente no arquivo .env ou nas configurações do Vercel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-8 w-full max-w-7xl mx-auto py-6 px-4">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#07262c] border border-cyan-500/30 p-6 rounded-3xl shadow-xl">
        <div>
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Painel Administrativo do Professor</span>
          <h2 className="text-3xl font-black text-white mt-1">Gerenciamento de Salas e Arena</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenCreate}
            className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-lg transition flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Criar Nova Sala</span>
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold transition text-sm flex items-center space-x-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-cyan-300 font-bold animate-pulse">Carregando salas em tempo real...</div>
      ) : error ? (
        <div className="text-center py-20 text-red-400 font-bold">{error}</div>
      ) : salas.length === 0 ? (
        <div className="text-center py-16 bg-[#07262c] border border-cyan-500/30 rounded-3xl text-cyan-300/60">
          Nenhuma sala cadastrada. Clique em "Criar Nova Sala" para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {salas.map((sala) => {
            const cadeiras = sala.cadeiras || [];
            const ocupadas = cadeiras.filter((c: any) => c.ocupada).length;
            const total = cadeiras.length;
            const jogoLiberado = sala.jogoLiberado === true;
            const jogoAtivo = sala.jogoAtivo || 'quiz';

            return (
              <div key={sala.id} className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                
                {/* Sala Info & Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-cyan-900/60">
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-2xl font-black text-white">{sala.nome}</h3>
                      <span className="text-xs font-black text-amber-400 bg-slate-950 px-3 py-1 rounded-xl">
                        PIN: {sala.pin || '1234'}
                      </span>
                    </div>
                    <p className="text-xs text-cyan-300/80 font-bold mt-1">
                      Ocupação: <strong className="text-amber-400">{ocupadas} de {total} cadeiras</strong>
                    </p>
                  </div>

                  {/* PROFESSOR GAME RELEASE CONTROLS */}
                  <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-4 rounded-2xl border border-cyan-900/60">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-cyan-300">Jogo Ativo:</span>
                      <select
                        value={jogoAtivo}
                        onChange={(e) => handleChangeJogoAtivo(sala.id, e.target.value)}
                        className="bg-[#07262c] border border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none"
                      >
                        <option value="quiz">Quiz</option>
                        <option value="forca">Forca</option>
                        <option value="verdadeiro_falso">Verdadeiro ou Falso</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleToggleLiberarJogos(sala.id, jogoLiberado)}
                      className={`px-5 py-2.5 rounded-xl font-black text-xs shadow-lg transition flex items-center space-x-2 ${jogoLiberado ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'bg-amber-400 hover:bg-amber-300 text-slate-950'}`}
                    >
                      {jogoLiberado ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      <span>{jogoLiberado ? 'Jogos Liberados (Bloquear)' : 'Liberar Jogos para Alunos'}</span>
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleLiberarTodas(sala.id)}
                      className="px-4 py-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/30 text-cyan-300 font-bold text-xs transition"
                    >
                      Liberar Cadeiras
                    </button>
                    <button
                      onClick={() => handleOpenEdit(sala)}
                      className="p-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600/30 text-cyan-300 transition"
                      title="Editar Sala"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSala(sala.id, sala.nome)}
                      className="p-2.5 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 transition"
                      title="Apagar Sala"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Chairs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
                  {cadeiras.map((c: any) => (
                    <div
                      key={c.id}
                      className={`p-3 rounded-2xl border flex flex-col items-center justify-center text-center space-y-1.5 transition ${c.ocupada ? 'bg-red-950/90 border-red-500 text-red-200 shadow-lg' : 'bg-slate-950 border-cyan-900/60 text-cyan-400'}`}
                    >
                      <div className="flex items-center space-x-1">
                        <Armchair className={`w-4 h-4 ${c.ocupada ? 'text-red-400' : 'text-cyan-500'}`} />
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
                        <span className="text-[10px] text-cyan-500/60 font-bold py-1">Livre</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Placar e Ranking da Sala */}
                <div className="mt-8 pt-6 border-t border-cyan-900/60 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <h4 className="text-lg font-black text-white">Placar e Ranking de Alunos</h4>
                  </div>

                  {ocupadas === 0 ? (
                    <div className="text-xs text-cyan-300/60 bg-slate-950 p-4 rounded-2xl border border-cyan-900/40 text-center">
                      Nenhum aluno sentado no momento para exibir o ranking.
                    </div>
                  ) : (
                    <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-cyan-900/60 text-[11px] font-black uppercase text-cyan-300">
                            <th className="py-2 px-3">Posição</th>
                            <th className="py-2 px-3">Aluno</th>
                            <th className="py-2 px-3">Cadeira</th>
                            <th className="py-2 px-3 text-right">Pontuação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cyan-900/40 text-xs font-semibold">
                          {[...cadeiras]
                            .filter((c: any) => c.ocupada && c.nomeAluno)
                            .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
                            .map((c: any, index: number) => {
                              const medalColors = index === 0 ? 'bg-amber-400 text-slate-950 font-black' : index === 1 ? 'bg-slate-300 text-slate-950 font-black' : index === 2 ? 'bg-amber-700 text-white font-black' : 'bg-slate-900 text-cyan-300';
                              return (
                                <tr key={c.id} className="hover:bg-[#07262c]/50 transition">
                                  <td className="py-3 px-3">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${medalColors}`}>
                                      {index + 1}º
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 flex items-center space-x-2">
                                    <span className="text-base">{c.avatar || '🦁'}</span>
                                    <span className="text-white font-bold">{c.nomeAluno}</span>
                                  </td>
                                  <td className="py-3 px-3 text-cyan-300 font-mono">
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
          <div className="bg-[#07262c] border border-cyan-500/40 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <h3 className="text-2xl font-black text-white text-center">
              {editingId ? 'Editar Sala de Cadeiras' : 'Criar Nova Sala de Cadeiras'}
            </h3>

            <form onSubmit={handleSaveSala} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Nome da Sala</label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Sala de Geografia - Turma A"
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">PIN da Sala (Senha)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-center text-xl tracking-widest text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Quantidade de Cadeiras (1 a 60)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  required
                  value={numCadeiras}
                  onChange={(e) => setNumCadeiras(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold transition"
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

    </div>
  );
};
