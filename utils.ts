
import { EventosManejo, Inseminacao, Parto } from './types';

// ==========================================
// UTILITÁRIOS GERAIS
// ==========================================

export function gerarUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function gerarUsuarioId(): string {
  let userId = localStorage.getItem('usuarioId');
  if (!userId) {
    userId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    localStorage.setItem('usuarioId', userId);
  }
  return userId;
}

export function formatarData(dataISO: string | null | undefined): string {
  if (!dataISO) return '-';
  const datePart = dataISO.split('T')[0];
  const [ano, mes, dia] = datePart.split('-');
  if (!ano || !mes || !dia) return '-';
  return `${dia}/${mes}/${ano}`;
}

export function parseDateBr(dateStr: string): string | null {
  if (!dateStr || dateStr === '-') return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Calcula a idade formatada em anos e meses a partir de uma data de nascimento
 */
export function calcularIdade(dataNascimento: string): string {
  if (!dataNascimento) return '-';
  const nasc = new Date(dataNascimento + 'T00:00:00');
  const hoje = new Date();
  
  let anos = hoje.getFullYear() - nasc.getFullYear();
  let meses = hoje.getMonth() - nasc.getMonth();
  
  if (meses < 0 || (meses === 0 && hoje.getDate() < nasc.getDate())) {
    anos--;
    meses += 12;
  }
  
  if (anos < 0) return 'Data Inválida';
  
  if (anos === 0) return `${meses} m`;
  if (meses === 0) return `${anos} a`;
  return `${anos}a ${meses}m`;
}

// ==========================================
// CÁLCULOS ZOOTÉCNICOS
// ==========================================

export const DIAS_GESTACAO_TOTAL = 114;
export const DIAS_RETORNO_CIO = 21;

function addDays(dateStr: string, days: number): Date {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + days);
    return date;
}

function toYYYYMMDD(date: Date): string {
    return date.toISOString().split('T')[0];
}

export function calcularDataEvento(dataBase: string, diaGestacao: number): string {
  const eventDate = addDays(dataBase, diaGestacao - 1);
  return toYYYYMMDD(eventDate);
}

export function gerarEventosManejoAutomaticos(primeiroDiaInseminacao: string): EventosManejo {
  return {
    coli1: {
      nome: '1ª Dose Coli',
      diaGestacao: 80,
      dataPrevista: calcularDataEvento(primeiroDiaInseminacao, 80),
      realizado: false,
      dataRealizacao: null,
      observacoes: ''
    },
    coli2: {
      nome: '2ª Dose Coli',
      diaGestacao: 100,
      dataPrevista: calcularDataEvento(primeiroDiaInseminacao, 100),
      realizado: false,
      dataRealizacao: null,
      observacoes: ''
    },
    vermifugacao: {
      nome: 'Vermifugação',
      diaGestacao: 100,
      dataPrevista: calcularDataEvento(primeiroDiaInseminacao, 100),
      realizado: false,
      dataRealizacao: null,
      observacoes: ''
    },
    transferencia: {
      nome: 'Transferência para Maternidade',
      diaGestacao: 107,
      dataPrevista: calcularDataEvento(primeiroDiaInseminacao, 107),
      realizado: false,
      dataRealizacao: null,
      observacoes: ''
    }
  };
}

export function calcularDataParto(primeiroDiaInseminacao: string): string {
  const data = addDays(primeiroDiaInseminacao, DIAS_GESTACAO_TOTAL);
  return toYYYYMMDD(data);
}

export function calcularDataRetornoCio(primeiroDiaInseminacao: string): string {
  const data = addDays(primeiroDiaInseminacao, DIAS_RETORNO_CIO);
  return toYYYYMMDD(data);
}

function getToday(): Date {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
}

export function calcularDiasGestacao(primeiroDiaInseminacao: string): number {
  const inicio = new Date(primeiroDiaInseminacao + 'T00:00:00');
  const hoje = getToday();
  const diferenca = hoje.getTime() - inicio.getTime();
  return Math.floor(diferenca / (1000 * 60 * 60 * 24)) + 1;
}

export function calcularDiasParaParto(primeiroDiaInseminacao: string): number {
  const dataPartoPrevisto = addDays(primeiroDiaInseminacao, DIAS_GESTACAO_TOTAL);
  const hoje = getToday();
  const diferenca = dataPartoPrevisto.getTime() - hoje.getTime();
  return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
}

export function calcularDiasParaEvento(dataPrevista: string): number {
    const dataEvento = new Date(dataPrevista + 'T00:00:00');
    const hoje = getToday();
    const diferenca = dataEvento.getTime() - hoje.getTime();
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
}

export function exportToCSV(data: Inseminacao[]) {
  const headers = [
    "Lote", "Nº Matriz", "1º Dia Inseminação", "Último Dia Inseminação", "Parto Previsto", "Gestante", "Parto Registrado",
    "1ª Coli Prevista", "1ª Coli Realizada",
    "2ª Coli Prevista", "2ª Coli Realizada",
    "Vermifugação Prevista", "Vermifugação Realizada",
    "Transferência Prevista", "Transferência Realizada",
    "Data Real Parto", "Nascidos Vivos", "Natimortos", "Mumificados", "Total Leitões"
  ];
  const rows = data.map(item => [
    item.lote,
    item.numeroMatriz,
    formatarData(item.primeiroDiaInseminacao),
    formatarData(item.ultimoDiaInseminacao),
    item.gestante === 'SIM' ? formatarData(calcularDataParto(item.primeiroDiaInseminacao)) : '-',
    item.gestante,
    item.parto ? 'SIM' : 'NÃO',
    item.eventosManejo ? formatarData(item.eventosManejo.coli1.dataPrevista) : '-',
    item.eventosManejo?.coli1.realizado ? 'SIM' : 'NÃO',
    item.eventosManejo ? formatarData(item.eventosManejo.coli2.dataPrevista) : '-',
    item.eventosManejo?.coli2.realizado ? 'SIM' : 'NÃO',
    item.eventosManejo ? formatarData(item.eventosManejo.vermifugacao.dataPrevista) : '-',
    item.eventosManejo?.vermifugacao.realizado ? 'SIM' : 'NÃO',
    item.eventosManejo ? formatarData(item.eventosManejo.transferencia.dataPrevista) : '-',
    item.eventosManejo?.transferencia.realizado ? 'SIM' : 'NÃO',
    item.parto ? formatarData(item.parto.dataRealParto) : '-',
    item.parto?.nascidosVivos ?? '-',
    item.parto?.natimortos ?? '-',
    item.parto?.mumificados ?? '-',
    item.parto?.totalLeitoes ?? '-'
  ]);

  let csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n" 
    + rows.map(e => e.join(",")).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "siglab_suinos.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSV(csvText: string): Inseminacao[] {
    const lines = csvText.split('\n');
    const data: Inseminacao[] = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',');
        const lote = cols[0];
        const numeroMatriz = parseInt(cols[1]);
        const primeiroDiaInseminacao = parseDateBr(cols[2]);
        const ultimoDiaInseminacao = parseDateBr(cols[3]);
        const gestante = cols[5] as 'SIM' | 'NÃO';
        if (!primeiroDiaInseminacao || isNaN(numeroMatriz)) continue;
        let eventosManejo = null;
        if (gestante === 'SIM') {
            eventosManejo = gerarEventosManejoAutomaticos(primeiroDiaInseminacao);
            if (cols[8] === 'SIM') {
                eventosManejo.coli1.realizado = true;
                eventosManejo.coli1.dataRealizacao = eventosManejo.coli1.dataPrevista;
            }
            if (cols[10] === 'SIM') {
                eventosManejo.coli2.realizado = true;
                eventosManejo.coli2.dataRealizacao = eventosManejo.coli2.dataPrevista;
            }
            if (cols[12] === 'SIM') {
                eventosManejo.vermifugacao.realizado = true;
                eventosManejo.vermifugacao.dataRealizacao = eventosManejo.vermifugacao.dataPrevista;
            }
            if (cols[14] === 'SIM') {
                eventosManejo.transferencia.realizado = true;
                eventosManejo.transferencia.dataRealizacao = eventosManejo.transferencia.dataPrevista;
            }
        }
        let parto: Parto | null = null;
        if (cols[6] === 'SIM') {
            const dataRealParto = parseDateBr(cols[15]);
            if (dataRealParto) {
                parto = {
                    dataRealParto,
                    nascidosVivos: parseInt(cols[16]) || 0,
                    natimortos: parseInt(cols[17]) || 0,
                    mumificados: parseInt(cols[18]) || 0,
                    pesoMedio: 0,
                    totalLeitoes: parseInt(cols[19]) || 0
                };
            }
        }
        data.push({
            id: gerarUUID(),
            usuarioId: gerarUsuarioId(),
            lote,
            numeroMatriz,
            primeiroDiaInseminacao,
            ultimoDiaInseminacao: ultimoDiaInseminacao,
            numeroDoses: null,
            numeroMacho: '',
            dataRetornoCio: gestante === 'NÃO' ? calcularDataRetornoCio(primeiroDiaInseminacao) : null,
            gestante,
            dataCadastro: new Date().toISOString(),
            eventosManejo,
            parto
        });
    }
    return data;
}
