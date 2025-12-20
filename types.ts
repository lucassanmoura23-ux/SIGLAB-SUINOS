
export interface EventoManejo {
  nome: string;
  diaGestacao: number;
  dataPrevista: string; // YYYY-MM-DD
  realizado: boolean;
  dataRealizacao: string | null; // YYYY-MM-DD
  observacoes: string;
}

export interface EventosManejo {
  coli1: EventoManejo;
  coli2: EventoManejo;
  vermifugacao: EventoManejo;
  transferencia: EventoManejo;
}

export interface Parto {
  dataRealParto: string; // YYYY-MM-DD
  natimortos: number;
  mumificados: number;
  nascidosVivos: number;
  pesoMedio: number;
  totalLeitoes: number;
}

export interface Matriz {
  id: string;
  numero: number;
  nome: string;
  raca: string;
  peso?: number; // Peso da matriz em kg
  pai: string; // Genealogia
  mae: string; // Genealogia
  dataNascimento: string;
  dataEntrada: string;
  status: 'ATIVA' | 'INATIVA' | 'DESCARTE';
  observacoes: string;
}

export interface Inseminacao {
  id: string;
  usuarioId: string;
  lote: string;
  numeroMatriz: number;
  primeiroDiaInseminacao: string; // YYYY-MM-DD
  ultimoDiaInseminacao: string | null; // YYYY-MM-DD
  numeroDoses: number | null;
  numeroMacho: string;
  dataRetornoCio: string | null; // YYYY-MM-DD
  gestante: 'SIM' | 'NÃO';
  dataCadastro: string; // ISO String
  eventosManejo: EventosManejo | null;
  parto: Parto | null;
}

export type Screen = 'dashboard' | 'matrizes' | 'inseminacao' | 'gestacao' | 'fichas' | 'relatorios';

export type Urgency = 'vermelho' | 'amarelo' | 'verde';
