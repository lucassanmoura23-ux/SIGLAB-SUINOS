
import { useState, useEffect, useCallback } from 'react';
import { Inseminacao, Matriz } from '../types';

const STORAGE_KEY = 'inseminacoes';
const MATRIZES_KEY = 'matrizes_cadastro';

export const useSwineData = () => {
  const [data, setData] = useState<Inseminacao[]>([]);
  const [matrizes, setMatrizes] = useState<Matriz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        setData(JSON.parse(storedData));
      }
      const storedMatrizes = localStorage.getItem(MATRIZES_KEY);
      if (storedMatrizes) {
        setMatrizes(JSON.parse(storedMatrizes));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveData = useCallback((newData: Inseminacao[]) => {
    try {
      const sortedData = newData.sort((a, b) => new Date(b.dataCadastro).getTime() - new Date(a.dataCadastro).getTime());
      setData(sortedData);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedData));
    } catch (error) {
      console.error("Failed to save data to localStorage", error);
    }
  }, []);

  const saveMatrizes = useCallback((newMatrizes: Matriz[]) => {
    try {
      const sorted = newMatrizes.sort((a, b) => a.numero - b.numero);
      setMatrizes(sorted);
      localStorage.setItem(MATRIZES_KEY, JSON.stringify(sorted));
    } catch (error) {
      console.error("Failed to save matrizes to localStorage", error);
    }
  }, []);

  const addInseminacao = useCallback((item: Inseminacao) => {
    saveData([...data, item]);
  }, [data, saveData]);

  const updateInseminacao = useCallback((id: string, updatedItem: Partial<Inseminacao>) => {
    const newData = data.map(item => 
      item.id === id ? { ...item, ...updatedItem } : item
    );
    saveData(newData);
  }, [data, saveData]);

  const removeInseminacao = useCallback((id: string) => {
    const newData = data.filter(item => item.id !== id);
    saveData(newData);
  }, [data, saveData]);

  const clearAllInseminacoes = useCallback(() => {
    saveData([]);
  }, [saveData]);

  const importInseminacoes = useCallback((newItems: Inseminacao[]) => {
    const updatedData = [...data, ...newItems];
    saveData(updatedData);
  }, [data, saveData]);

  const addMatriz = useCallback((item: Matriz) => {
    saveMatrizes([...matrizes, item]);
  }, [matrizes, saveMatrizes]);

  const updateMatriz = useCallback((id: string, updated: Partial<Matriz>) => {
    const newData = matrizes.map(m => m.id === id ? { ...m, ...updated } : m);
    saveMatrizes(newData);
  }, [matrizes, saveMatrizes]);

  const removeMatriz = useCallback((id: string) => {
    saveMatrizes(matrizes.filter(m => m.id !== id));
  }, [matrizes, saveMatrizes]);
  
  return { 
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
  };
};
