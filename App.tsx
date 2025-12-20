
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Inseminacao, Screen, Urgency, EventoManejo, EventosManejo, Parto, Matriz } from './types';
import { useSwineData } from './hooks/useSwineData';
import { GoogleGenAI } from "@google/genai";
import {
  calcularDataRetornoCio,
  gerarEventosManejoAutomaticos,
  gerarUUID,
  gerarUsuarioId,
  formatarData,
  calcularDiasGestacao,
  calcularDiasParaParto,
  calcularDataParto,
  calcularDiasParaEvento,
  calcularIdade,
  exportToCSV,
  parseCSV
} from './utils';
import {
  SaveIcon,
  TrashIcon,
  EyeIcon,
  EditIcon,
  PigIcon,
  UsersIcon,
  ChevronDownIcon,
  SyringeIcon,
  PillIcon,
  HospitalIcon,
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  UploadIcon,
  SparklesIcon,
  FileTextIcon,
  LayoutGridIcon,
  PrinterIcon,
  XIcon,
  TrendingUpIcon,
  BarChartIcon,
  FilterIcon,
  StarIcon,
  AlertTriangleIcon
} from './components/Icons';

// ==================================
// HELPER COMPONENTS & FUNCTIONS
// ==================================

const getStatusDisplay = (item: Inseminacao) => {
    // Lógica para LACTANTE ou VAZIA (Pós-Parto)
    if (item.parto) {
        const dataParto = new Date(item.parto.dataRealParto + 'T00:00:00');
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        
        const diffTime = hoje.getTime() - dataParto.getTime();
        const diasPosParto = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diasPosParto >= 0 && diasPosParto <= 28) {
            return { 
                label: 'LACTANTE', 
                style: 'bg-purple-100 text-purple-800 border border-purple-200' 
            };
        } else {
            return { 
                label: 'VAZIA', 
                style: 'bg-gray-100 text-gray-800 border border-gray-200' 
            };
        }
    }

    if (item.gestante === 'SIM') {
        return { 
            label: 'GESTANTE', 
            style: 'bg-green-100 text-green-800 border border-green-200' 
        };
    }

    return { 
        label: 'NÃO GESTANTE', 
        style: 'bg-red-100 text-red-800 border border-red-200' 
    };
};

const Modal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode 
}> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">{title}</h3>
                                <div className="mt-2 text-sm text-gray-500 w-full">
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm" onClick={onClose}>
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isDangerous?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', isDangerous = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto rounded-full sm:mx-0 sm:h-10 sm:w-10 ${isDangerous ? 'bg-red-100' : 'bg-green-100'}`}>
                {isDangerous ? (
                   <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                ) : (
                   <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                   </svg>
                )}
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{message}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm ${
                isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const getUrgencyStyling = (urgency: Urgency) => {
  switch (urgency) {
    case 'vermelho': return { border: 'border-l-4 border-red-500', bg: 'bg-red-50', headerBg: 'bg-red-100' };
    case 'amarelo': return { border: 'border-l-4 border-yellow-500', bg: 'bg-yellow-50', headerBg: 'bg-yellow-100' };
    case 'verde': return { border: 'border-l-4 border-green-500', bg: 'bg-green-50', headerBg: 'bg-green-100' };
  }
};

const EventoItem: React.FC<{
  evento: EventoManejo, 
  onUpdate: (changes: Partial<EventoManejo>) => void 
}> = ({ evento, onUpdate }) => {
  const diasPara = calcularDiasParaEvento(evento.dataPrevista);
  let statusBadge;
  if(evento.realizado) {
    statusBadge = <span className="text-xs font-semibold text-green-700">Realizado em {formatarData(evento.dataRealizacao)}</span>
  } else if (diasPara > 0) {
    statusBadge = <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Faltam {diasPara} dias</span>
  } else if (diasPara === 0) {
    statusBadge = <span className="text-xs font-semibold text-green-800 bg-green-200 px-2 py-1 rounded-full animate-pulso">É HOJE!</span>
  } else {
    statusBadge = <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">Atrasado {Math.abs(diasPara)} dias</span>
  }

  const getIcon = () => {
    if (evento.nome.includes('Coli')) return <SyringeIcon className="w-6 h-6 text-green-700" />;
    if (evento.nome.includes('Vermifugação')) return <PillIcon className="w-6 h-6 text-green-700" />;
    if (evento.nome.includes('Transferência')) return <HospitalIcon className="w-6 h-6 text-green-700" />;
    return null;
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    onUpdate({
        realizado: isChecked,
        dataRealizacao: isChecked ? new Date().toISOString().split('T')[0] : null
    });
  };

  return (
    <div className="py-3 px-4 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getIcon()}
          <div>
            <p className="font-semibold text-gray-800">{evento.nome}</p>
            <p className="text-xs text-gray-500">Previsto: {formatarData(evento.dataPrevista)} (Dia {evento.diaGestacao})</p>
          </div>
        </div>
        {statusBadge}
      </div>
      <div className="mt-2 pl-9 space-y-2">
        <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input 
                    type="checkbox" 
                    checked={evento.realizado} 
                    onChange={handleCheckboxChange} 
                    className="rounded text-green-600 focus:ring-green-600"
                />
                <span className="font-medium">Marcar como realizado</span>
            </label>
            
            {evento.realizado && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Data:</span>
                    <input 
                        type="date" 
                        value={evento.dataRealizacao || ''} 
                        onChange={(e) => onUpdate({ dataRealizacao: e.target.value })}
                        className="text-sm p-1 border border-gray-300 rounded-md focus:ring-green-600 focus:border-green-600"
                    />
                </div>
            )}
        </div>
        
        <input 
          type="text" 
          placeholder="Adicionar observações..."
          value={evento.observacoes}
          onChange={(e) => onUpdate({ observacoes: e.target.value })}
          className="w-full text-sm p-1.5 border border-gray-200 rounded-md focus:ring-green-600 focus:border-green-600"
        />
      </div>
    </div>
  );
};

const GestationCard: React.FC<{matriz: Inseminacao, updateInseminacao: Function}> = ({ matriz, updateInseminacao }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const diasGestacao = calcularDiasGestacao(matriz.primeiroDiaInseminacao);
  const diasParaParto = calcularDiasParaParto(matriz.primeiroDiaInseminacao);
  
  const urgency: Urgency = diasParaParto <= 7 ? 'vermelho' : diasParaParto <= 14 ? 'amarelo' : 'verde';
  const styles = getUrgencyStyling(urgency);

  const handleUpdateEvento = (key: keyof EventosManejo, changes: Partial<EventoManejo>) => {
    if (!matriz.eventosManejo) return;
    const evento = matriz.eventosManejo[key];
    const updatedEvento: EventoManejo = {
        ...evento,
        ...changes
    };
    const updatedEventos: EventosManejo = {
        ...matriz.eventosManejo,
        [key]: updatedEvento
    };
    updateInseminacao(matriz.id, { eventosManejo: updatedEventos });
  };
  
  return (
    <div className={`rounded-lg shadow-md overflow-hidden ${styles.border} ${styles.bg}`}>
      <div className={`p-4 ${styles.headerBg}`}>
        <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold text-gray-600">Lote: {matriz.lote || '-'}</span>
              <h3 className="text-xl font-bold text-gray-800">Matriz Nº {matriz.numeroMatriz}</h3>
              <p className="text-xs text-gray-500">Inseminação: {formatarData(matriz.primeiroDiaInseminacao)}</p>
            </div>
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-full hover:bg-black/10 transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}}>
                <ChevronDownIcon className="w-6 h-6 text-gray-600"/>
            </button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-3 gap-2 text-center">
        <div>
            <p className="text-2xl font-bold text-green-700">{diasGestacao}</p>
            <p className="text-xs text-gray-600">Dias de Gestação</p>
        </div>
        <div>
            <p className="text-sm font-semibold text-gray-800">{formatarData(calcularDataParto(matriz.primeiroDiaInseminacao))}</p>
            <p className="text-xs text-gray-600">Parto Previsto</p>
        </div>
        <div>
            <p className="text-2xl font-bold text-green-700">{diasParaParto}</p>
            <p className="text-xs text-gray-600">Dias p/ Parto</p>
        </div>
      </div>
      {isExpanded && matriz.eventosManejo && (
        <div className="bg-white">
          <h4 className="px-4 pt-4 text-sm font-bold text-gray-600">Cronograma de Eventos</h4>
          <EventoItem evento={matriz.eventosManejo.coli1} onUpdate={(c) => handleUpdateEvento('coli1', c)} />
          <EventoItem evento={matriz.eventosManejo.coli2} onUpdate={(c) => handleUpdateEvento('coli2', c)} />
          <EventoItem evento={matriz.eventosManejo.vermifugacao} onUpdate={(c) => handleUpdateEvento('vermifugacao', c)} />
          <EventoItem evento={matriz.eventosManejo.transferencia} onUpdate={(c) => handleUpdateEvento('transferencia', c)} />
        </div>
      )}
    </div>
  );
};

// ==================================
// SCREENS (PAGE COMPONENTS)
// ==================================

// --- MATRIZES SCREEN (CADASTRO) ---
const MatrizesScreen: React.FC<{
    matrizes: Matriz[];
    addMatriz: (m: Matriz) => void;
    updateMatriz: (id: string, m: Partial<Matriz>) => void;
    removeMatriz: (id: string) => void;
    showToast: (msg: string) => void;
}> = ({ matrizes, addMatriz, updateMatriz, removeMatriz, showToast }) => {
    const [form, setForm] = useState<Omit<Matriz, 'id'>>({
        numero: 0,
        nome: '',
        raca: '',
        pai: '',
        mae: '',
        dataNascimento: '',
        dataEntrada: '',
        status: 'ATIVA',
        observacoes: ''
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.numero <= 0) {
            showToast("❌ Número da matriz é obrigatório.");
            return;
        }

        if (editingId) {
            updateMatriz(editingId, form);
            showToast("✅ Matriz atualizada com sucesso.");
        } else {
            addMatriz({ ...form, id: gerarUUID() });
            showToast("✅ Matriz cadastrada com sucesso.");
        }

        setForm({ numero: 0, nome: '', raca: '', pai: '', mae: '', dataNascimento: '', dataEntrada: '', status: 'ATIVA', observacoes: '' });
        setEditingId(null);
    };

    return (
        <div className="p-6 space-y-6 animate-[fadeIn_0.5s_ease-in-out]">
            <div className={`bg-white p-6 rounded-lg shadow-md ${editingId ? 'border-2 border-yellow-400' : ''}`}>
                <h2 className="text-xl font-bold text-green-700 mb-6">{editingId ? 'Editar Matriz' : 'Cadastrar Nova Matriz'}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Brinco/Nº Matriz <span className="text-red-500">*</span></label>
                        <input type="number" className="w-full p-2 border rounded focus:ring-green-600" value={form.numero || ''} onChange={e => setForm({...form, numero: parseInt(e.target.value) || 0})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome/Apelido</label>
                        <input type="text" className="w-full p-2 border rounded focus:ring-green-600" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Raça</label>
                        <input type="text" className="w-full p-2 border rounded focus:ring-green-600" value={form.raca} onChange={e => setForm({...form, raca: e.target.value})} />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pai (Genealogia)</label>
                        <input type="text" placeholder="Ex: Cachaço 400" className="w-full p-2 border rounded focus:ring-green-600" value={form.pai} onChange={e => setForm({...form, pai: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mãe (Genealogia)</label>
                        <input type="text" placeholder="Ex: Matriz 150" className="w-full p-2 border rounded focus:ring-green-600" value={form.mae} onChange={e => setForm({...form, mae: e.target.value})} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select className="w-full p-2 border rounded focus:ring-green-600" value={form.status} onChange={e => setForm({...form, status: e.target.value as any})}>
                            <option value="ATIVA">Ativa</option>
                            <option value="INATIVA">Inativa</option>
                            <option value="DESCARTE">Descarte</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Nascimento</label>
                        <input type="date" className="w-full p-2 border rounded focus:ring-green-600" value={form.dataNascimento} onChange={e => setForm({...form, dataNascimento: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Entrada na Granja</label>
                        <input type="date" className="w-full p-2 border rounded focus:ring-green-600" value={form.dataEntrada} onChange={e => setForm({...form, dataEntrada: e.target.value})} />
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea className="w-full p-2 border rounded focus:ring-green-600" rows={2} value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}></textarea>
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2">
                         {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ numero: 0, nome: '', raca: '', pai: '', mae: '', dataNascimento: '', dataEntrada: '', status: 'ATIVA', observacoes: '' }); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded transition-colors">Cancelar</button>}
                         <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 flex items-center gap-2 shadow-sm transition-colors transition-all"><SaveIcon className="w-5 h-5"/> {editingId ? 'Atualizar' : 'Salvar'}</button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-gray-50 border-b font-bold text-gray-700">Fichas de Matrizes ({matrizes.length})</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-green-50 text-green-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Nº Matriz</th>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Idade</th>
                                <th className="px-6 py-4">Genealogia (P/M)</th>
                                <th className="px-6 py-4">Raça</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4">Entrada</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {matrizes.map(m => (
                                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900">{m.numero}</td>
                                    <td className="px-6 py-4">{m.nome || '-'}</td>
                                    <td className="px-6 py-4 font-semibold text-blue-600">{calcularIdade(m.dataNascimento)}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-[10px] text-gray-400 font-semibold uppercase">P: <span className="text-gray-600">{m.pai || '?'}</span></div>
                                        <div className="text-[10px] text-gray-400 font-semibold uppercase">M: <span className="text-gray-600">{m.mae || '?'}</span></div>
                                    </td>
                                    <td className="px-6 py-4">{m.raca || '-'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${m.status === 'ATIVA' ? 'bg-green-100 text-green-800' : m.status === 'DESCARTE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {m.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs">{formatarData(m.dataEntrada)}</td>
                                    <td className="px-6 py-4 flex gap-2 justify-center">
                                        <button onClick={() => { setEditingId(m.id); setForm(m); window.scrollTo(0,0); }} title="Editar" className="text-yellow-600 hover:text-yellow-800 transition-colors"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => removeMatriz(m.id)} title="Excluir" className="text-red-600 hover:text-red-800 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            ))}
                            {matrizes.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-400">Nenhuma matriz cadastrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- DASHBOARD SCREEN ---

const KPICard: React.FC<{ title: string, value: string | number, subtext: string, icon: React.ReactNode, color: string }> = ({ title, value, subtext, icon, color }) => {
    return (
        <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                <h3 className={`text-3xl font-bold ${color}`}>{value}</h3>
                <p className="text-xs text-gray-400 mt-1">{subtext}</p>
            </div>
            <div className={`p-3 rounded-full opacity-20 ${color.replace('text-', 'bg-').replace('700', '200')}`}>
                {icon}
            </div>
        </div>
    );
};

const RankingTable: React.FC<{ data: { id: number, partos: number, vivos: number, mediaVivos: number }[] }> = ({ data }) => {
    const renderClassification = (media: number) => {
        if (media >= 12) return <div className="flex text-yellow-400" title={`Excelente: Média ${media.toFixed(1)}`}><StarIcon className="w-5 h-5"/><StarIcon className="w-5 h-5"/><StarIcon className="w-5 h-5"/></div>;
        if (media >= 10) return <div className="flex text-yellow-400" title={`Bom: Média ${media.toFixed(1)}`}><StarIcon className="w-5 h-5"/><StarIcon className="w-5 h-5"/></div>;
        if (media >= 8) return <div className="flex text-yellow-400" title={`Regular: Média ${media.toFixed(1)}`}><StarIcon className="w-5 h-5"/></div>;
        return <div className="text-red-500" title={`Abaixo do esperado: Média ${media.toFixed(1)}`}><AlertTriangleIcon className="w-5 h-5"/></div>;
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <h3 className="text-lg font-bold text-gray-800 p-6 pb-2">Ranking de Produtividade (Quantidade de Leitões)</h3>
            <div className="overflow-x-auto p-2">
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="border-b-2 border-gray-900 text-gray-700 font-bold uppercase tracking-wider">
                            <th className="py-3 px-4 border-r border-gray-300">Matriz</th>
                            <th className="py-3 px-4 border-r border-gray-300 text-center">Partos</th>
                            <th className="py-3 px-4 border-r border-gray-300 text-center">Total Vivos</th>
                            <th className="py-3 px-4 border-r border-gray-300 text-center">Média/Parto</th>
                            <th className="py-3 px-4 text-center">Classificação</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700 font-mono">
                        {data.map((row, index) => (
                            <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-4 font-bold border-r border-gray-300">{row.id}</td>
                                <td className="py-3 px-4 border-r border-gray-300 text-center">{row.partos}</td>
                                <td className="py-3 px-4 border-r border-gray-300 text-center font-bold text-green-700">{row.vivos}</td>
                                <td className="py-3 px-4 border-r border-gray-300 text-center">{row.mediaVivos.toFixed(1)}</td>
                                <td className="py-3 px-4 flex justify-center">{renderClassification(row.mediaVivos)}</td>
                            </tr>
                        ))}
                         {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-500 italic">Sem dados de partos suficientes para the ranking.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const VerticalBarChart: React.FC<{ data: { label: string, value: number }[], title: string, color: string }> = ({ data, title, color }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-6">{title}</h3>
            <div className="flex items-end space-x-2 h-64 pb-2 border-b border-gray-200 w-full">
                {data.map((d, i) => {
                    const heightPercentage = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
                    return (
                        <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 font-bold">
                                {d.value}
                            </div>
                            <div 
                                className={`w-full rounded-t ${color} transition-all duration-500 hover:opacity-80 relative`} 
                                style={{ height: `${heightPercentage}%`, minHeight: d.value > 0 ? '4px' : '0' }}
                            >
                            </div>
                        </div>
                    );
                })}
            </div>
             <div className="flex space-x-2 mt-2">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 text-center">
                        <span className="text-[10px] md:text-xs text-gray-500 font-medium block truncate uppercase">{d.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HorizontalBarChart: React.FC<{ data: { label: string, vivos: number, perdas: number }[], title: string }> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => Number(d.vivos) + Number(d.perdas)), 1);
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6">{title}</h3>
            <div className="space-y-4">
                {data.map((d, i) => {
                    const vivosPct = maxValue > 0 ? (Number(d.vivos) / maxValue) * 100 : 0;
                    const perdasPct = maxValue > 0 ? (Number(d.perdas) / maxValue) * 100 : 0;
                    
                    return (
                        <div key={i} className="relative">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-bold text-gray-700">Matriz {d.label}</span>
                                <span className="text-gray-500">{d.vivos} Vivos | {d.perdas} Perdas</span>
                            </div>
                            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex">
                                <div className="h-full bg-green-500" style={{ width: `${vivosPct}%` }}></div>
                                <div className="h-full bg-red-400" style={{ width: `${perdasPct}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 flex gap-4 justify-center text-xs">
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-sm"></div><span>Vivos</span></div>
                 <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded-sm"></div><span>Perdas</span></div>
            </div>
        </div>
    );
};

const DashboardScreen: React.FC<{ data: Inseminacao[], matrizesCount: number }> = ({ data, matrizesCount }) => {
    // Filters State
    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterMatriz, setFilterMatriz] = useState('');

    // Derived Lists for Dropdowns
    const availableYears = useMemo(() => {
        const years = new Set(data.map(d => d.primeiroDiaInseminacao.split('-')[0]));
        return Array.from(years).sort().reverse();
    }, [data]);

    const availableMatrizes = useMemo(() => {
        const matrizes = new Set(data.map(d => d.numeroMatriz));
        return Array.from(matrizes).sort((a,b) => Number(a) - Number(b));
    }, [data]);

    const months = [
        { value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' },
        { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' },
        { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' },
        { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' }
    ];

    // Aggregation Logic with Filters
    const { filteredData, stats } = useMemo(() => {
        const filtered = data.filter(item => {
             // 1. Matriz Filter
             const matrizMatch = filterMatriz ? item.numeroMatriz.toString() === filterMatriz : true;

             // Date references
             const dataParto = item.parto ? new Date(item.parto.dataRealParto + 'T00:00:00') : null;

             // 2. Year Filter
             let yearMatch = true;
             if (filterYear) {
                 if (item.parto) {
                     yearMatch = item.parto.dataRealParto.startsWith(filterYear);
                 } else {
                     yearMatch = item.primeiroDiaInseminacao.startsWith(filterYear);
                 }
             }

             // 3. Month Filter (ADJUSTED LOGIC: Filter by Parto Month)
             let monthMatch = true;
             if (filterMonth) {
                 if (dataParto) {
                     monthMatch = dataParto.getMonth().toString() === filterMonth;
                 } else {
                     monthMatch = false;
                 }
             }

             return yearMatch && monthMatch && matrizMatch;
        });

        const totalCiclos = filtered.length;
        const totalPartos = filtered.filter(d => d.parto).length;
        const totalVivos = filtered.reduce((acc, curr) => acc + (curr.parto?.nascidosVivos || 0), 0);
        const totalPerdas = filtered.reduce((acc, curr) => acc + ((curr.parto?.natimortos || 0) + (curr.parto?.mumificados || 0)), 0);
        
        // Group by Matriz
        const matrizMap = new Map<number, { id: number, partos: number, vivos: number, perdas: number, totalLeitoes: number, ciclos: number }>();
        const birthsByMonth = Array(12).fill(0);

        filtered.forEach(item => {
            const m = matrizMap.get(item.numeroMatriz) || { id: item.numeroMatriz, partos: 0, vivos: 0, perdas: 0, totalLeitoes: 0, ciclos: 0 };
            m.ciclos += 1;
            if (item.parto) {
                m.partos += 1;
                m.vivos += item.parto.nascidosVivos;
                m.perdas += (item.parto.natimortos + item.parto.mumificados);
                m.totalLeitoes += item.parto.totalLeitoes;

                if (item.parto.dataRealParto) {
                    const parts = item.parto.dataRealParto.split('-');
                    if (parts.length === 3) {
                         const monthIndex = parseInt(parts[1]) - 1; // 0-11
                         if (monthIndex >= 0 && monthIndex < 12) {
                             birthsByMonth[monthIndex] += item.parto.nascidosVivos;
                         }
                    }
                }
            }
            matrizMap.set(item.numeroMatriz, m);
        });
        
        const matrizStats = Array.from(matrizMap.values());
        
        const rankingData = matrizStats.map(m => ({
            ...m,
            mediaVivos: m.partos > 0 ? m.vivos / m.partos : 0,
            taxa: m.ciclos > 0 ? (m.partos / m.ciclos) * 100 : 0
        })).sort((a,b) => {
             return b.vivos - a.vivos;
        });
        
        const topProdutividade = [...matrizStats].sort((a,b) => b.totalLeitoes - a.totalLeitoes).slice(0, 10);
        
        const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const birthsChartData = monthLabels.map((label, i) => ({ label, value: birthsByMonth[i] }));

        return { filteredData: filtered, stats: { totalCiclos, totalPartos, totalVivos, totalPerdas, rankingData, topProdutividade, birthsChartData } };
    }, [data, filterYear, filterMonth, filterMatriz]);

    return (
        <div className="p-6 space-y-6 animate-[fadeIn_0.5s_ease-in-out]">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Dashboard Geral</h2>
                    <span className="text-sm text-gray-500">Visão consolidada do rebanho</span>
                </div>
                
                <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-gray-500 mr-2">
                        <FilterIcon className="w-5 h-5" />
                        <span className="text-sm font-semibold uppercase">Filtros</span>
                    </div>
                    
                    <select 
                        value={filterYear} 
                        onChange={e => setFilterYear(e.target.value)}
                        className="p-2 border rounded-md text-sm text-gray-700 focus:ring-green-600 focus:border-green-600"
                    >
                        <option value="">Todos os Anos</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <select 
                        value={filterMonth} 
                        onChange={e => setFilterMonth(e.target.value)}
                        className="p-2 border rounded-md text-sm text-gray-700 focus:ring-green-600 focus:border-green-600"
                    >
                        <option value="">Todos os Meses</option>
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>

                    <select 
                        value={filterMatriz} 
                        onChange={e => setFilterMatriz(e.target.value)}
                        className="p-2 border rounded-md text-sm text-gray-700 focus:ring-green-600 focus:border-green-600"
                    >
                        <option value="">Todas Matrizes</option>
                        {availableMatrizes.map(m => <option key={m} value={m}>Matriz {m}</option>)}
                    </select>

                    {(filterYear || filterMonth || filterMatriz) && (
                        <button 
                            onClick={() => { setFilterYear(''); setFilterMonth(''); setFilterMatriz(''); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium ml-1 underline"
                        >
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <KPICard 
                    title="Total de Matrizes" 
                    value={matrizesCount} 
                    subtext="Cadastradas" 
                    icon={<UsersIcon className="w-6 h-6 text-emerald-700"/>} 
                    color="text-emerald-700" 
                />
                <KPICard 
                    title="Total de Ciclos" 
                    value={stats.totalCiclos} 
                    subtext="Registros no período" 
                    icon={<FileTextIcon className="w-6 h-6 text-blue-700"/>} 
                    color="text-blue-700" 
                />
                <KPICard 
                    title="Total de Partos" 
                    value={stats.totalPartos} 
                    subtext="Confirmados" 
                    icon={<CheckCircleIcon className="w-6 h-6 text-green-700"/>} 
                    color="text-green-700" 
                />
                <KPICard 
                    title="Total Vivos" 
                    value={stats.totalVivos} 
                    subtext="Leitões nascidos vivos" 
                    icon={<PigIcon className="w-6 h-6 text-emerald-600"/>} 
                    color="text-emerald-600" 
                />
                <KPICard 
                    title="Total Perdas" 
                    value={stats.totalPerdas} 
                    subtext="Natimortos + Mumificados" 
                    icon={<XIcon className="w-6 h-6 text-red-600"/>} 
                    color="text-red-600" 
                />
            </div>

            <div className="mb-6 w-full">
                <VerticalBarChart 
                    title="Quantos Porcos Nasceram por Mês" 
                    data={stats.birthsChartData} 
                    color="bg-blue-500" 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RankingTable 
                    data={stats.rankingData.map(m => ({ 
                        id: m.id, 
                        partos: m.partos, 
                        vivos: m.vivos, 
                        mediaVivos: m.mediaVivos 
                    }))} 
                />

                <HorizontalBarChart 
                    title="Top 10 - Total Leitões Produzidos (Vivos + Perdas)"
                    data={stats.topProdutividade.map(m => ({ label: m.id.toString(), vivos: m.vivos, perdas: m.perdas }))}
                />
            </div>
        </div>
    );
};

// --- RELATÓRIOS SCREEN ---

const RelatoriosScreen: React.FC<{ 
    data: Inseminacao[], 
    showToast: (message: string) => void
}> = ({ data, showToast }) => {
    // Filters
    const [selectedMatrizNumero, setSelectedMatrizNumero] = useState<string | null>(null);
    const [filterYear, setFilterYear] = useState<string>('');
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);

    // Derived Lists for Dropdowns
    const uniqueMatrizes = useMemo(() => Array.from(new Set(data.map(d => d.numeroMatriz))).sort((a,b) => Number(a) - Number(b)), [data]);
    const availableYears = useMemo(() => Array.from(new Set(data.map(d => d.primeiroDiaInseminacao.split('-')[0]))).sort().reverse(), [data]);

    // Filtering Logic
    const history = useMemo(() => {
        let filtered = data;

        if (selectedMatrizNumero && selectedMatrizNumero !== 'TODOS') {
            filtered = filtered.filter(d => d.numeroMatriz.toString() === selectedMatrizNumero);
        }

        if (filterYear) {
            filtered = filtered.filter(d => d.primeiroDiaInseminacao.startsWith(filterYear));
        }

        return filtered.sort((a,b) => new Date(b.primeiroDiaInseminacao).getTime() - new Date(a.primeiroDiaInseminacao).getTime());
    }, [data, selectedMatrizNumero, filterYear]);

    // Metrics Logic
    const metrics = useMemo(() => {
        const totalCiclos = history.length;
        const partosRegistrados = history.filter(h => h.parto).length;
        const taxaParto = totalCiclos > 0 ? (partosRegistrados / totalCiclos) * 100 : 0;
        
        const totalNascidosVivos = history.reduce((acc, curr) => acc + (curr.parto?.nascidosVivos || 0), 0);
        const mediaNascidosVivos = partosRegistrados > 0 ? totalNascidosVivos / partosRegistrados : 0;
        
        const totalPerdas = history.reduce((acc, curr) => acc + (curr.parto?.natimortos || 0) + (curr.parto?.mumificados || 0), 0);
        
        return { totalCiclos, partosRegistrados, taxaParto, totalNascidosVivos, mediaNascidosVivos, totalPerdas };
    }, [history]);

    const handleGenerateAIReport = async () => {
        if (history.length === 0) { showToast("❌ Sem dados para análise."); return; }
        setIsGeneratingAI(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let prompt = '';
            if (!selectedMatrizNumero || selectedMatrizNumero === 'TODOS') {
                prompt = `Faça uma análise zootécnica completa do rebanho suíno${filterYear ? ` do ano de ${filterYear}` : ''}. Dados consolidados: ${metrics.totalCiclos} inseminações, ${metrics.partosRegistrados} partos, taxa de parto ${metrics.taxaParto.toFixed(1)}%, média de nascidos vivos ${metrics.mediaNascidosVivos.toFixed(1)}, total de perdas (natimortos/mumificados) ${metrics.totalPerdas}. Identifique pontos críticos e sugira melhorias de manejo.`;
            } else {
                prompt = `Analise o histórico da Matriz Suína ${selectedMatrizNumero}${filterYear ? ` em ${filterYear}` : ''}. Dados: ${history.map(h => `Insem: ${h.primeiroDiaInseminacao}, Parto: ${h.parto ? 'Sim ('+h.parto.totalLeitoes+' leitões, '+h.parto.nascidosVivos+' vivos)' : 'Não'}`).join('; ')}. Resuma performance produtiva e reprodutiva.`;
            }
            
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            setAiReport(response.text);
            setShowAIModal(true);
        } catch (e) {
            showToast("❌ Erro na IA.");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleDownloadAIReport = () => {
        const w = window.open('', '', 'width=800,height=600');
        if(w) {
            w.document.write(`
              <html>
                  <head>
                      <title>Relatório IA - SIGLAB SUINOS</title>
                      <style>body { font-family: sans-serif; padding: 40px; line-height: 1.6; } h1 { color: #166534; border-bottom: 2px solid #166534; padding-bottom: 10px; }</style>
                  </head>
                  <body>
                      <h1>Análise Zootécnica Inteligente</h1>
                      <p><strong>Data:</strong> ${new Date().toLocaleDateString()}</p>
                      <p><strong>Alvo:</strong> ${!selectedMatrizNumero || selectedMatrizNumero === 'TODOS' ? 'Rebanho Geral' : `Matriz ${selectedMatrizNumero}`}</p>
                      ${filterYear ? `<p><strong>Ano Base:</strong> ${filterYear}</p>` : ''}
                      <hr/>
                      <div style="white-space: pre-wrap;">${aiReport}</div>
                  </body>
              </html>
            `);
            w.document.close();
            setTimeout(() => { w.print(); }, 500);
        }
    };

    return (
        <div className="space-y-6 p-6 animate-[fadeIn_0.5s_ease-in-out]">
            <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-600">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Relatórios de Desempenho</h2>
                        <span className="text-sm text-gray-500">Análise individual e do rebanho</span>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Selecione a Matriz</label>
                        <select 
                            className="w-full p-2 border rounded focus:ring-green-600 font-medium text-gray-700" 
                            value={selectedMatrizNumero || ''} 
                            onChange={e => setSelectedMatrizNumero(e.target.value)}
                        >
                            <option value="">-- Selecione uma opção --</option>
                            <option value="TODOS">Todas as Matrizes (Visão Geral)</option>
                            {uniqueMatrizes.map(m => <option key={m} value={m}>Matriz {m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Ano</label>
                        <select 
                            className="w-full p-2 border rounded focus:ring-green-600 font-medium text-gray-700" 
                            value={filterYear} 
                            onChange={e => setFilterYear(e.target.value)}
                        >
                            <option value="">Todos os Anos</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {selectedMatrizNumero && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                               <TrendingUpIcon className="w-6 h-6"/> KPIs - {selectedMatrizNumero === 'TODOS' ? 'Geral' : `Matriz ${selectedMatrizNumero}`}
                            </h3>
                            <div className="flex gap-2">
                                 <button onClick={handleGenerateAIReport} disabled={isGeneratingAI} className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-purple-700 transition-colors shadow-sm font-medium">
                                    {isGeneratingAI ? 'Analisando...' : <><SparklesIcon className="w-4 h-4"/> Análise IA</>}
                                 </button>
                                 <button onClick={() => exportToCSV(history)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm font-medium">
                                    <DownloadIcon className="w-4 h-4"/> Gerar CSV
                                 </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
                                <p className="text-3xl font-bold text-blue-700">{metrics.totalCiclos}</p>
                                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mt-1">Ciclos</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-center">
                                <p className="text-3xl font-bold text-green-700">{metrics.partosRegistrados}</p>
                                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mt-1">Partos</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                                <p className="text-3xl font-bold text-emerald-700">{metrics.taxaParto.toFixed(1)}%</p>
                                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide mt-1">Taxa Parto</p>
                            </div>
                            <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100 text-center">
                                <p className="text-3xl font-bold text-indigo-700">{metrics.mediaNascidosVivos.toFixed(1)}</p>
                                <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide mt-1">Média Vivos</p>
                            </div>
                            <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                                <p className="text-3xl font-bold text-red-700">{metrics.totalPerdas}</p>
                                <p className="text-xs text-red-600 font-semibold uppercase tracking-wide mt-1">Perdas</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex items-center gap-2">
                            <FileTextIcon className="w-5 h-5"/> Histórico Detalhado
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left text-gray-500">
                              <thead className="bg-green-50 text-green-700 uppercase text-xs font-bold">
                                  <tr>
                                      <th className="px-6 py-3">Matriz</th>
                                      <th className="px-6 py-3">Inseminação</th>
                                      <th className="px-6 py-3">Status</th>
                                      <th className="px-6 py-3">Data Parto</th>
                                      <th className="px-6 py-3 text-center">Nascidos Vivos</th>
                                      <th className="px-6 py-3 text-center">Perdas</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {history.map(h => {
                                      const status = getStatusDisplay(h);
                                      return (
                                          <tr key={h.id} className="border-b hover:bg-gray-50">
                                              <td className="px-6 py-4 font-bold">{h.numeroMatriz}</td>
                                              <td className="px-6 py-4">{formatarData(h.primeiroDiaInseminacao)}</td>
                                              <td className="px-6 py-4">
                                                  <span className={`px-2 py-1 rounded text-xs font-bold ${status.style}`}>{status.label}</span>
                                              </td>
                                              <td className="px-6 py-4">{h.parto ? formatarData(h.parto.dataRealParto) : '-'}</td>
                                              <td className="px-6 py-4 text-center font-bold text-gray-800">{h.parto ? h.parto.nascidosVivos : '-'}</td>
                                              <td className="px-6 py-4 text-center text-red-600">{h.parto ? (h.parto.natimortos + h.parto.mumificados) : '-'}</td>
                                          </tr>
                                      );
                                  })}
                                  {history.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Nenhum registro encontrado para este filtro.</td></tr>}
                              </tbody>
                          </table>
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={showAIModal} onClose={() => setShowAIModal(false)} title="Análise Zootécnica (IA)">
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line mb-4">{aiReport}</div>
                <div className="flex justify-end pt-2 border-t border-gray-100">
                    <button onClick={handleDownloadAIReport} className="bg-gray-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-gray-800">
                       <DownloadIcon className="w-4 h-4"/> Baixar Relatório (PDF)
                    </button>
                </div>
            </Modal>
        </div>
    );
};

// --- INSEMINAÇÃO SCREEN ---
const InseminacaoScreen: React.FC<{
  data: Inseminacao[];
  matrizes: Matriz[];
  addInseminacao: (item: Inseminacao) => void;
  updateInseminacao: (id: string, updatedItem: Partial<Inseminacao>) => void;
  removeInseminacao: (id: string) => void;
  clearAllInseminacoes: () => void;
  importInseminacoes: (items: Inseminacao[]) => void;
  showToast: (message: string) => void;
  setActiveScreen: (screen: Screen) => void;
  setSelectedMatrizId: (id: string | null) => void;
}> = ({ data, matrizes, addInseminacao, updateInseminacao, removeInseminacao, clearAllInseminacoes, importInseminacoes, showToast, setActiveScreen, setSelectedMatrizId }) => {
  const [formState, setFormState] = useState({
    lote: '',
    numeroMatriz: '',
    primeiroDiaInseminacao: '',
    ultimoDiaInseminacao: '',
    numeroDoses: '',
    numeroMacho: '',
    dataRetornoCio: '',
    gestante: 'SIM' as 'SIM' | 'NÃO',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; type: 'single' | 'all'; id?: string }>({ isOpen: false, type: 'single' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterMatriz, setFilterMatriz] = useState('');
  const [filterMacho, setFilterMacho] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [filterMonthInsem, setFilterMonthInsem] = useState('');
  const [filterMonthLastInsem, setFilterMonthLastInsem] = useState('');

  const months = [
    { value: '', label: 'Mês Insem. (Todos)' },
    { value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' }
  ];

  const filteredData = useMemo(() => {
    return data.filter(item => {
        const matchMatriz = filterMatriz ? item.numeroMatriz.toString().includes(filterMatriz) : true;
        const matchMacho = filterMacho ? (item.numeroMacho || '').toLowerCase().includes(filterMacho.toLowerCase()) : true;
        
        const currentStatus = getStatusDisplay(item).label;
        const matchStatus = filterStatus === 'TODOS' ? true : currentStatus === filterStatus;
        
        let matchMonthInsem = true;
        if (filterMonthInsem !== '' && item.primeiroDiaInseminacao) {
            const d = new Date(item.primeiroDiaInseminacao + 'T00:00:00');
            if (d.getMonth().toString() !== filterMonthInsem) matchMonthInsem = false;
        }

        let matchMonthLastInsem = true;
        if (filterMonthLastInsem !== '') {
            if (!item.ultimoDiaInseminacao) {
                 matchMonthLastInsem = false; 
            } else {
                 const d = new Date(item.ultimoDiaInseminacao + 'T00:00:00');
                 if (d.getMonth().toString() !== filterMonthLastInsem) matchMonthLastInsem = false;
            }
        } else {
             matchMonthLastInsem = true;
        }

        return matchMatriz && matchMacho && matchStatus && matchMonthInsem && matchMonthLastInsem;
    });
  }, [data, filterMatriz, filterMacho, filterStatus, filterMonthInsem, filterMonthLastInsem]);

  useEffect(() => {
    if (formState.gestante === 'NÃO' && formState.primeiroDiaInseminacao && !formState.dataRetornoCio) {
      setFormState(prev => ({ ...prev, dataRetornoCio: calcularDataRetornoCio(formState.primeiroDiaInseminacao) }));
    }
  }, [formState.gestante, formState.primeiroDiaInseminacao]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.numeroMatriz || !formState.primeiroDiaInseminacao) {
      showToast('❌ Campos obrigatórios faltando.');
      return;
    }
    
    const payload = {
        lote: formState.lote,
        numeroMatriz: parseInt(formState.numeroMatriz),
        primeiroDiaInseminacao: formState.primeiroDiaInseminacao,
        ultimoDiaInseminacao: formState.ultimoDiaInseminacao || null,
        numeroDoses: formState.numeroDoses ? parseInt(formState.numeroDoses) : null,
        numeroMacho: formState.numeroMacho,
        dataRetornoCio: formState.dataRetornoCio || null,
        gestante: formState.gestante,
    };

    if (editingId) {
        updateInseminacao(editingId, payload);
        showToast('✅ Registro atualizado!');
    } else {
        addInseminacao({
            id: gerarUUID(),
            usuarioId: gerarUsuarioId(),
            ...payload,
            dataCadastro: new Date().toISOString(),
            eventosManejo: formState.gestante === 'SIM' ? gerarEventosManejoAutomaticos(formState.primeiroDiaInseminacao) : null,
            parto: null
        });
        showToast('✅ Registro salvo!');
    }
    setFormState({ lote: '', numeroMatriz: '', primeiroDiaInseminacao: '', ultimoDiaInseminacao: '', numeroDoses: '', numeroMacho: '', dataRetornoCio: '', gestante: 'SIM' });
    setEditingId(null);
  };

  const confirmDelete = () => {
      if(deleteConfirmation.type === 'all') clearAllInseminacoes();
      else if (deleteConfirmation.id) removeInseminacao(deleteConfirmation.id);
      setDeleteConfirmation({isOpen: false, type: 'single'});
      showToast('🗑️ Excluído com sucesso.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          const text = evt.target?.result as string;
          if (text) {
              const items = parseCSV(text);
              if (items.length > 0) {
                  importInseminacoes(items);
                  showToast(`✅ ${items.length} registros importados.`);
              } else {
                  showToast('❌ Nenhum registro válido encontrado.');
              }
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const StatusLegend = () => (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm">
        <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
           <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg> 
           Legenda de Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-gray-700">
           <div className="flex flex-col gap-1">
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold border border-green-200 w-fit">GESTANTE</span>
              <span className="text-xs">Matriz inseminada, aguardando parto.</span>
           </div>
           <div className="flex flex-col gap-1">
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold border border-purple-200 w-fit">LACTANTE</span>
              <span className="text-xs">Pariu recentemente (até 28 dias), amamentando.</span>
           </div>
           <div className="flex flex-col gap-1">
              <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-bold border border-gray-200 w-fit">VAZIA</span>
              <span className="text-xs">Desmamada (pós-lactação), pronta p/ inseminar.</span>
           </div>
           <div className="flex flex-col gap-1">
              <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold border border-red-200 w-fit">NÃO GESTANTE</span>
              <span className="text-xs">Falha na inseminação, retorno ao cio ou aborto.</span>
           </div>
        </div>
      </div>
  );

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-in-out] p-6">
        <div className={`bg-white p-6 rounded-lg shadow-md ${editingId ? 'border-2 border-yellow-400' : ''}`}>
             <h2 className="text-xl font-bold text-green-700 mb-4">{editingId ? 'Editar Registro' : 'Novo Registro de Inseminação'}</h2>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Lote</label>
                        <input type="text" placeholder="Ex: L001" className="w-full p-2 border rounded focus:ring-green-600 focus:border-green-600" value={formState.lote} onChange={e => setFormState({...formState, lote: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nº Matriz <span className="text-red-500">*</span></label>
                        {matrizes.length > 0 ? (
                            <select className="w-full p-2 border rounded focus:ring-green-600 focus:border-green-600" required value={formState.numeroMatriz} onChange={e => setFormState({...formState, numeroMatriz: e.target.value})}>
                                <option value="">-- Selecione a Matriz --</option>
                                {matrizes.map(m => <option key={m.id} value={m.numero}>Matriz {m.numero} {m.nome ? `(${m.nome})` : ''}</option>)}
                            </select>
                        ) : (
                            <input type="number" placeholder="Ex: 123" className="w-full p-2 border rounded focus:ring-green-600 focus:border-green-600" required value={formState.numeroMatriz} onChange={e => setFormState({...formState, numeroMatriz: e.target.value})} />
                        )}
                        {matrizes.length === 0 && <p className="text-[10px] text-orange-600 mt-1">Dica: Cadastre matrizes primeiro para seleção rápida.</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">1º Dia Inseminação <span className="text-red-500">*</span></label>
                        <input type="date" className="w-full p-2 border rounded focus:ring-green-600 focus:border-green-600" required value={formState.primeiroDiaInseminacao} onChange={e => setFormState({...formState, primeiroDiaInseminacao: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Último Dia Inseminação</label>
                        <input type="date" className="w-full p-2 border rounded focus:ring-green-600 focus:border-green-600" value={formState.ultimoDiaInseminacao} onChange={e => setFormState({...formState, ultimoDiaInseminacao: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nº Doses</label>
                        <input type="number" placeholder="Ex: 2" className="w-full p-2 border rounded focus:ring-green-600 focus:border-green-600" value={formState.numeroDoses} onChange={e => setFormState({...formState, numeroDoses: e.target.value})} />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Nº Macho</label>
                         <input type="text" placeholder="Ex: M456" className="w-full p-2 border rounded focus:ring-green-600 focus:border-green-600" value={formState.numeroMacho} onChange={e => setFormState({...formState, numeroMacho: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Retorno Cio</label>
                        <input type="date" className="w-full p-2 border rounded focus:ring-green-600 focus:border-green-600" value={formState.dataRetornoCio} onChange={e => setFormState({...formState, dataRetornoCio: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Gestante <span className="text-red-500">*</span></label>
                        <select className="w-full p-2 border rounded focus:ring-green-600 focus:border-green-600" value={formState.gestante} onChange={e => setFormState({...formState, gestante: e.target.value as 'SIM'|'NÃO'})}>
                            <option value="SIM">SIM</option>
                            <option value="NÃO">NÃO</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end mt-6">
                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-md font-bold flex items-center gap-2 hover:bg-green-700 transition-colors"><SaveIcon className="w-5 h-5"/> {editingId ? 'Salvar Alterações' : 'Salvar Registro'}</button>
                </div>
             </form>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-green-700">Registros ({filteredData.length})</h2>
                <div className="flex gap-2">
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                     <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 bg-green-600 text-white py-2 px-3 rounded hover:bg-green-700 text-sm"><UploadIcon className="h-4 w-4"/> Importar CSV</button>
                     <button onClick={() => exportToCSV(data)} className="flex items-center gap-2 bg-blue-600 text-white py-2 px-3 rounded hover:bg-blue-700 text-sm"><DownloadIcon className="h-4 w-4"/> Exportar CSV</button>
                     {data.length > 0 && (
                        <button onClick={() => setDeleteConfirmation({isOpen: true, type: 'all'})} className="flex items-center gap-2 bg-red-100 text-red-600 py-2 px-3 rounded hover:bg-red-200 text-sm border border-red-200"><TrashIcon className="h-4 w-4"/> Apagar Tudo</button>
                     )}
                </div>
            </div>

            <StatusLegend />

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 p-4 bg-gray-50 rounded border border-gray-200">
                <input type="text" placeholder="Filtrar Matriz..." className="p-2 border rounded text-sm focus:ring-green-600 focus:border-green-600" value={filterMatriz} onChange={e => setFilterMatriz(e.target.value)} />
                <input type="text" placeholder="Filtrar Macho..." className="p-2 border rounded text-sm focus:ring-green-600 focus:border-green-600" value={filterMacho} onChange={e => setFilterMacho(e.target.value)} />
                <select className="p-2 border rounded text-sm focus:ring-green-600 focus:border-green-600" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="TODOS">Todas Situações</option>
                    <option value="GESTANTE">Gestante</option>
                    <option value="LACTANTE">Lactante</option>
                    <option value="VAZIA">Vazia (Pós-Desmame)</option>
                    <option value="NÃO GESTANTE">Não Gestante</option>
                </select>
                <select className="p-2 border rounded text-sm focus:ring-green-600 focus:border-green-600" value={filterMonthInsem} onChange={e => setFilterMonthInsem(e.target.value)}>
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select className="p-2 border rounded text-sm focus:ring-green-600 focus:border-green-600" value={filterMonthLastInsem} onChange={e => setFilterMonthLastInsem(e.target.value)}>
                    <option value="">Mês Último Insem. (Todos)</option>
                    {months.slice(1).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-green-900 uppercase bg-green-50/80 font-bold border-b border-green-100">
                        <tr>
                            <th className="px-6 py-4">Matriz</th>
                            <th className="px-6 py-4">Lote</th>
                            <th className="px-6 py-4">1ª Insem.</th>
                            <th className="px-6 py-4">Últ. Insem.</th>
                            <th className="px-6 py-4">Macho</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.slice(0, 50).map(item => {
                            const status = getStatusDisplay(item);
                            return (
                                <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900">{item.numeroMatriz}</td>
                                    <td className="px-6 py-4">{item.lote || '-'}</td>
                                    <td className="px-6 py-4">{formatarData(item.primeiroDiaInseminacao)}</td>
                                    <td className="px-6 py-4">{formatarData(item.ultimoDiaInseminacao)}</td>
                                    <td className="px-6 py-4">{item.numeroMacho || '-'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${status.style}`}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex gap-2">
                                        <button onClick={() => { setEditingId(item.id); setFormState({ ...formState, numeroMatriz: item.numeroMatriz.toString(), lote: item.lote, gestante: item.gestante, primeiroDiaInseminacao: item.primeiroDiaInseminacao, numeroMacho: item.numeroMacho || '', ultimoDiaInseminacao: item.ultimoDiaInseminacao || '', numeroDoses: item.numeroDoses?.toString() || '', dataRetornoCio: item.dataRetornoCio || '' }); window.scrollTo(0,0); }} className="text-yellow-600 hover:text-yellow-800 transition-colors"><EditIcon className="w-5 h-5"/></button>
                                        <button onClick={() => setDeleteConfirmation({isOpen: true, type: 'single', id: item.id})} className="text-red-600 hover:text-red-800 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredData.length === 0 && <tr><td colSpan={7} className="text-center py-4 text-gray-500">Nenhum registro encontrado.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
        <ConfirmationModal isOpen={deleteConfirmation.isOpen} onClose={() => setDeleteConfirmation({isOpen:false, type: 'single'})} onConfirm={confirmDelete} title="Confirmar Exclusão" message="Tem certeza? Esta ação não pode ser desfeita." isDangerous={true} />
    </div>
  );
};

// --- GESTACAO SCREEN ---
const GestacaoScreen: React.FC<{ data: Inseminacao[], updateInseminacao: (id: string, item: Partial<Inseminacao>) => void }> = ({ data, updateInseminacao }) => {
    const gestantes = useMemo(() => 
        data.filter(item => item.gestante === 'SIM' && !item.parto)
            .sort((a,b) => new Date(a.primeiroDiaInseminacao).getTime() - new Date(b.primeiroDiaInseminacao).getTime())
    , [data]);

    return (
        <div className="p-6 space-y-6 animate-[fadeIn_0.5s_ease-in-out]">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-pink-100 rounded-full">
                    <PigIcon className="w-6 h-6 text-pink-600"/>
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Gestação Ativa</h2>
                    <p className="text-sm text-gray-500">Monitoramento de matrizes gestantes ({gestantes.length})</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gestantes.map(item => (
                    <GestationCard key={item.id} matriz={item} updateInseminacao={updateInseminacao} />
                ))}
            </div>
            
            {gestantes.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <PigIcon className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                    <p className="text-gray-500 font-medium">Nenhuma matriz em gestação no momento.</p>
                </div>
            )}
        </div>
    );
};

// --- FICHAS SCREEN ---

const FichasScreen: React.FC<{ 
    data: Inseminacao[], 
    updateInseminacao: (id: string, data: Partial<Inseminacao>) => void,
    showToast: (msg: string) => void
}> = ({ data, updateInseminacao, showToast }) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [partoForm, setPartoForm] = useState<Parto>({
        dataRealParto: new Date().toISOString().split('T')[0],
        natimortos: 0,
        mumificados: 0,
        nascidosVivos: 0,
        pesoMedio: 0,
        totalLeitoes: 0
    });

    const pendentesParto = useMemo(() => {
        return data
            .filter(d => d.gestante === 'SIM' && !d.parto)
            .sort((a,b) => calcularDiasParaParto(a.primeiroDiaInseminacao) - calcularDiasParaParto(b.primeiroDiaInseminacao));
    }, [data]);
    
    useEffect(() => {
        setPartoForm(prev => ({
            ...prev,
            totalLeitoes: (Number(prev.nascidosVivos) || 0) + (Number(prev.natimortos) || 0) + (Number(prev.mumificados) || 0)
        }));
    }, [partoForm.nascidosVivos, partoForm.natimortos, partoForm.mumificados]);

    const handleSaveParto = () => {
        if (!selectedId) return;
        updateInseminacao(selectedId, { parto: partoForm });
        showToast('✅ Parto registrado com sucesso!');
        setSelectedId(null);
        setPartoForm({
            dataRealParto: new Date().toISOString().split('T')[0],
            natimortos: 0,
            mumificados: 0,
            nascidosVivos: 0,
            pesoMedio: 0,
            totalLeitoes: 0
        });
    };

    const selectedMatriz = data.find(d => d.id === selectedId);

    return (
        <div className="p-6 space-y-6 animate-[fadeIn_0.5s_ease-in-out]">
            <div>
                 <h2 className="text-2xl font-bold text-gray-800">Maternidade & Partos</h2>
                 <span className="text-sm text-gray-500">Registre os nascimentos e acompanhe a produtividade</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 bg-green-50 border-b border-green-100 font-bold text-green-800 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5"/> Próximos Partos
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {pendentesParto.map(item => {
                             const dias = calcularDiasParaParto(item.primeiroDiaInseminacao);
                             const isLate = dias <= 0;
                             const urgencyClass = isLate ? 'bg-red-50 hover:bg-red-100' : dias <= 3 ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-gray-50';
                             return (
                                 <div 
                                    key={item.id} 
                                    onClick={() => setSelectedId(item.id)}
                                    className={`p-4 border-b cursor-pointer transition-all ${urgencyClass} ${selectedId === item.id ? 'ring-2 ring-inset ring-green-600' : ''}`}
                                 >
                                     <div className="flex justify-between items-center mb-1">
                                         <span className="font-bold text-gray-800">Matriz {item.numeroMatriz}</span>
                                         <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isLate ? 'bg-red-200 text-red-800' : dias <= 3 ? 'bg-orange-200 text-orange-800' : 'bg-blue-100 text-blue-700'}`}>
                                             {isLate ? `${Math.abs(dias)} dias atraso` : `${dias} dias rest.`}
                                         </span>
                                     </div>
                                     <div className="text-xs text-gray-500 flex justify-between">
                                         <span>Lote: {item.lote || '-'}</span>
                                         <span>Prev: {formatarData(calcularDataParto(item.primeiroDiaInseminacao))}</span>
                                     </div>
                                 </div>
                             );
                        })}
                        {pendentesParto.length === 0 && <div className="p-8 text-center text-gray-500 italic">Nenhuma matriz gestante aguardando parto.</div>}
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {selectedId && selectedMatriz ? (
                        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 animate-[fadeIn_0.3s_ease-in-out]">
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                                <div className="bg-green-100 p-3 rounded-full"><HospitalIcon className="w-6 h-6 text-green-700"/></div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Registrar Parto - Matriz {selectedMatriz.numeroMatriz}</h3>
                                    <p className="text-sm text-gray-500">Inseminada em {formatarData(selectedMatriz.primeiroDiaInseminacao)} • Lote {selectedMatriz.lote}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Real do Parto</label>
                                    <input type="date" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all" value={partoForm.dataRealParto} onChange={e => setPartoForm({...partoForm, dataRealParto: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nascidos Vivos</label>
                                    <input type="number" min="0" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all" value={partoForm.nascidosVivos} onChange={e => setPartoForm({...partoForm, nascidosVivos: parseInt(e.target.value) || 0})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Natimortos</label>
                                    <input type="number" min="0" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all" value={partoForm.natimortos} onChange={e => setPartoForm({...partoForm, natimortos: parseInt(e.target.value) || 0})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mumificados</label>
                                    <input type="number" min="0" className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all" value={partoForm.mumificados} onChange={e => setPartoForm({...partoForm, mumificados: parseInt(e.target.value) || 0})} />
                                </div>
                            </div>
                            
                            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                                <span className="font-bold text-blue-800">Total de Leitões Nascidos</span>
                                <span className="text-3xl font-bold text-blue-700">{partoForm.totalLeitoes}</span>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button onClick={() => setSelectedId(null)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">Cancelar</button>
                                <button onClick={handleSaveParto} className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 transition-all transform hover:scale-105">
                                    <SaveIcon className="w-5 h-5"/> Confirmar Parto
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 h-full flex flex-col items-center justify-center p-12 text-center text-gray-400">
                            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                <PigIcon className="w-12 h-12 text-gray-300"/>
                            </div>
                            <h3 className="text-lg font-medium text-gray-600">Selecione uma Matriz</h3>
                            <p className="max-w-xs mt-2">Escolha uma matriz na lista lateral para registrar os dados do parto.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- APP COMPONENT ---

const App: React.FC = () => {
    const { 
        data, 
        matrizes,
        loading, 
        addInseminacao, 
        updateInseminacao, 
        removeInseminacao, 
        clearAllInseminacoes, 
        importInseminacoes,
        addMatriz,
        updateMatriz,
        removeMatriz
    } = useSwineData();
    const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');
    const [toast, setToast] = useState<{message: string, visible: boolean}>({ message: '', visible: false });

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    const renderScreen = () => {
        switch(activeScreen) {
            case 'dashboard':
                return <DashboardScreen data={data} matrizesCount={matrizes.length} />;
            case 'matrizes':
                return <MatrizesScreen 
                    matrizes={matrizes} 
                    addMatriz={addMatriz} 
                    updateMatriz={updateMatriz} 
                    removeMatriz={removeMatriz} 
                    showToast={showToast} 
                />;
            case 'inseminacao':
                return <InseminacaoScreen 
                    data={data} 
                    matrizes={matrizes}
                    addInseminacao={addInseminacao} 
                    updateInseminacao={updateInseminacao} 
                    removeInseminacao={removeInseminacao} 
                    clearAllInseminacoes={clearAllInseminacoes}
                    importInseminacoes={importInseminacoes}
                    showToast={showToast}
                    setActiveScreen={setActiveScreen}
                    setSelectedMatrizId={() => {}}
                />;
            case 'gestacao':
                return <GestacaoScreen data={data} updateInseminacao={updateInseminacao} />;
            case 'fichas':
                return <FichasScreen data={data} updateInseminacao={updateInseminacao} showToast={showToast} />;
            case 'relatorios':
                return <RelatoriosScreen data={data} showToast={showToast} />;
            default:
                return <DashboardScreen data={data} matrizesCount={matrizes.length} />;
        }
    };

    const NavItem: React.FC<{ screen: Screen, icon: React.ReactNode, label: string }> = ({ screen, icon, label }) => (
        <button 
            onClick={() => setActiveScreen(screen)} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors transition-all ${activeScreen === screen ? 'bg-green-600 text-white shadow-md' : 'text-gray-600 hover:bg-green-50'}`}
        >
            {icon}
            <span className="font-medium">{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-100 flex font-sans text-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-10 hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-100 flex flex-col items-center text-center gap-3">
                    <div>
                        <h1 className="text-2xl font-black text-green-700 tracking-tighter leading-tight">SIGLAB SUINOS</h1>
                        <p className="text-[10px] text-gray-500 uppercase font-semibold mt-1">Sistema de Controle por Matrizes</p>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <NavItem screen="dashboard" icon={<LayoutGridIcon className="w-5 h-5"/>} label="Dashboard" />
                    <NavItem screen="matrizes" icon={<UsersIcon className="w-5 h-5"/>} label="Cad. Matrizes" />
                    <NavItem screen="inseminacao" icon={<EditIcon className="w-5 h-5"/>} label="Inseminação" />
                    <NavItem screen="gestacao" icon={<ClockIcon className="w-5 h-5"/>} label="Gestação" />
                    <NavItem screen="fichas" icon={<FileTextIcon className="w-5 h-5"/>} label="Maternidade" />
                    <NavItem screen="relatorios" icon={<BarChartIcon className="w-5 h-5"/>} label="Relatórios" />
                </nav>
                <div className="p-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 text-center">v1.0.0 - SIGLAB SUINOS</p>
                </div>
            </aside>

            {/* Mobile Nav */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around p-2 shadow-lg">
                 <button onClick={() => setActiveScreen('dashboard')} title="Dashboard" className={`p-2 rounded-full transition-all ${activeScreen === 'dashboard' ? 'text-green-600 bg-green-50' : 'text-gray-500'}`}><LayoutGridIcon className="w-6 h-6"/></button>
                 <button onClick={() => setActiveScreen('matrizes')} title="Matrizes" className={`p-2 rounded-full transition-all ${activeScreen === 'matrizes' ? 'text-green-600 bg-green-50' : 'text-gray-500'}`}><UsersIcon className="w-6 h-6"/></button>
                 <button onClick={() => setActiveScreen('inseminacao')} title="Inseminação" className={`p-2 rounded-full transition-all ${activeScreen === 'inseminacao' ? 'text-green-600 bg-green-50' : 'text-gray-500'}`}><EditIcon className="w-6 h-6"/></button>
                 <button onClick={() => setActiveScreen('gestacao')} title="Gestação" className={`p-2 rounded-full transition-all ${activeScreen === 'gestacao' ? 'text-green-600 bg-green-50' : 'text-gray-500'}`}><ClockIcon className="w-6 h-6"/></button>
                 <button onClick={() => setActiveScreen('fichas')} title="Maternidade" className={`p-2 rounded-full transition-all ${activeScreen === 'fichas' ? 'text-green-600 bg-green-50' : 'text-gray-500'}`}><FileTextIcon className="w-6 h-6"/></button>
                 <button onClick={() => setActiveScreen('relatorios')} title="Relatórios" className={`p-2 rounded-full transition-all ${activeScreen === 'relatorios' ? 'text-green-600 bg-green-50' : 'text-gray-500'}`}><BarChartIcon className="w-6 h-6"/></button>
            </div>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto mb-16 md:mb-0">
                <header className="flex items-center gap-3 mb-8 md:hidden bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-xl font-black text-green-700 tracking-tighter">SIGLAB SUINOS</h1>
                        <p className="text-[10px] text-gray-500 font-medium">Controle por Matrizes</p>
                    </div>
                </header>
                {renderScreen()}
            </main>

            {/* Toast Notification */}
            {toast.visible && (
                <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slideUp z-[100]">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default App;
