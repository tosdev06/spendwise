import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useExpenses(month) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadExpenses();
  }, [month]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      // Load from Supabase
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (supabaseError) throw supabaseError;

      // Load offline expenses
      const offlineExpensesJSON = await AsyncStorage.getItem('offline_expenses');
      const offlineExpenses = offlineExpensesJSON ? JSON.parse(offlineExpensesJSON) : [];
      
      // Filter for current month
      const filteredOffline = offlineExpenses.filter(expense => {
        if (expense.is_synced) return false; // Already synced
        const expenseDate = new Date(expense.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });

      // Combine and sort
      const allExpenses = [...(supabaseData || []), ...filteredOffline].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setExpenses(allExpenses);

    } catch (err) {
      setError(err.message);
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async (expenseData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const newExpense = {
        ...expenseData,
        user_id: user.id,
        created_at: new Date().toISOString(),
      };

      // Check if online
      const isOnline = navigator.onLine;

      if (isOnline) {
        // Save to Supabase
        const { data, error } = await supabase
          .from('expenses')
          .insert([newExpense])
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setExpenses(prev => [data, ...prev]);
        return { success: true, data, isOnline: true };
      } else {
        // Save offline
        const localId = `local_${Date.now()}`;
        const offlineExpense = {
          ...newExpense,
          local_id: localId,
          is_synced: false,
        };

        const savedExpenses = await AsyncStorage.getItem('offline_expenses');
        const expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
        expenses.push(offlineExpense);
        await AsyncStorage.setItem('offline_expenses', JSON.stringify(expenses));

        // Add to sync queue
        const syncQueue = await AsyncStorage.getItem('sync_queue');
        const queue = syncQueue ? JSON.parse(syncQueue) : [];
        queue.push({
          table_name: 'expenses',
          operation: 'INSERT',
          data: offlineExpense,
          local_id: localId,
          created_at: new Date().toISOString(),
        });
        await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));

        // Update local state
        setExpenses(prev => [offlineExpense, ...prev]);
        return { success: true, data: offlineExpense, isOnline: false };
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      return { success: false, error: err.message };
    }
  };

  const deleteExpense = async (expenseId, isLocal = false) => {
    try {
      if (isLocal) {
        // Delete from local storage
        const savedExpenses = await AsyncStorage.getItem('offline_expenses');
        let expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
        expenses = expenses.filter(exp => exp.local_id !== expenseId);
        await AsyncStorage.setItem('offline_expenses', JSON.stringify(expenses));
      } else {
        // Delete from Supabase
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseId);

        if (error) throw error;
      }

      // Update local state
      setExpenses(prev => prev.filter(exp => 
        (isLocal ? exp.local_id !== expenseId : exp.id !== expenseId)
      ));

      return { success: true };
    } catch (err) {
      console.error('Error deleting expense:', err);
      return { success: false, error: err.message };
    }
  };

  const updateExpense = async (expenseId, updates, isLocal = false) => {
    try {
      if (isLocal) {
        // Update in local storage
        const savedExpenses = await AsyncStorage.getItem('offline_expenses');
        let expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
        expenses = expenses.map(exp => 
          exp.local_id === expenseId ? { ...exp, ...updates } : exp
        );
        await AsyncStorage.setItem('offline_expenses', JSON.stringify(expenses));
      } else {
        // Update in Supabase
        const { error } = await supabase
          .from('expenses')
          .update(updates)
          .eq('id', expenseId);

        if (error) throw error;
      }

      // Update local state
      setExpenses(prev => prev.map(exp => 
        (isLocal ? exp.local_id === expenseId : exp.id === expenseId)
          ? { ...exp, ...updates }
          : exp
      ));

      return { success: true };
    } catch (err) {
      console.error('Error updating expense:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    expenses,
    loading,
    error,
    addExpense,
    deleteExpense,
    updateExpense,
    refresh: loadExpenses,
  };
}