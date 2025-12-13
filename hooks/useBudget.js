import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useBudget() {
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Load monthly budget
      const { data: userData } = await supabase
        .from('users')
        .select('monthly_budget')
        .eq('id', user.id)
        .single();

      if (userData) {
        setMonthlyBudget(userData.monthly_budget || 0);
      }

      // Load category budgets for current month
      const currentMonth = new Date();
      currentMonth.setDate(1);
      
      const { data: budgets } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .gte('month', currentMonth.toISOString().split('T')[0])
        .lte('month', currentMonth.toISOString().split('T')[0]);

      const budgetMap = {};
      budgets?.forEach(budget => {
        budgetMap[budget.category] = budget.amount;
      });
      setCategoryBudgets(budgetMap);

    } catch (err) {
      setError(err.message);
      console.error('Error loading budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateMonthlyBudget = async (amount) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('users')
        .update({ monthly_budget: amount })
        .eq('id', user.id);

      if (error) throw error;

      setMonthlyBudget(amount);
      return { success: true };
    } catch (err) {
      console.error('Error updating monthly budget:', err);
      return { success: false, error: err.message };
    }
  };

  const updateCategoryBudget = async (category, amount) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const currentMonth = new Date();
      currentMonth.setDate(1);

      const { error } = await supabase
        .from('budgets')
        .upsert({
          user_id: user.id,
          category,
          amount,
          month: currentMonth.toISOString().split('T')[0],
        }, {
          onConflict: 'user_id,category,month',
        });

      if (error) throw error;

      setCategoryBudgets(prev => ({
        ...prev,
        [category]: amount,
      }));

      return { success: true };
    } catch (err) {
      console.error('Error updating category budget:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    monthlyBudget,
    categoryBudgets,
    loading,
    error,
    updateMonthlyBudget,
    updateCategoryBudget,
    refresh: loadBudgetData,
  };
}