
import { useState, useEffect, useCallback } from 'react';
import { Inseminacao } from '../types';

const STORAGE_KEY = 'inseminacoes';

export const useSwineData = () => {
  const [data, setData] = useState<Inseminacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        setData(JSON.parse(storedData));
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
  
  return { data, loading, addInseminacao, updateInseminacao, removeInseminacao, clearAllInseminacoes, importInseminacoes };
};
