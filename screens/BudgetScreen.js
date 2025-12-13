import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressBar } from 'react-native-paper';
import { supabase, CATEGORIES, COLORS } from '../lib/supabase';

export default function BudgetScreen() {
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState({});
  const [categorySpending, setCategorySpending] = useState({});
  const [loading, setLoading] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user's monthly budget
      const { data: userData } = await supabase
        .from('users')
        .select('monthly_budget')
        .eq('id', user.id)
        .single();
      
      if (userData) {
        setMonthlyBudget(userData.monthly_budget.toString());
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
        budgetMap[budget.category] = budget.amount.toString();
      });
      setCategoryBudgets(budgetMap);

      // Load spending for current month
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0]);

      const spendingMap = {};
      let total = 0;
      
      Object.values(CATEGORIES).forEach(cat => {
        spendingMap[cat] = 0;
      });

      expenses?.forEach(expense => {
        spendingMap[expense.category] += parseFloat(expense.amount);
        total += parseFloat(expense.amount);
      });

      setCategorySpending(spendingMap);
      setTotalSpent(total);

    } catch (error) {
      console.error('Error loading budget data:', error);
    }
  };

  const saveMonthlyBudget = async () => {
    const budgetValue = parseFloat(monthlyBudget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('users')
        .update({ monthly_budget: budgetValue })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Monthly budget updated!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveCategoryBudget = async (category, amount) => {
    const budgetValue = parseFloat(amount);
    if (isNaN(budgetValue) || budgetValue < 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentMonth = new Date();
      currentMonth.setDate(1);

      const { error } = await supabase
        .from('budgets')
        .upsert({
          user_id: user.id,
          category,
          amount: budgetValue,
          month: currentMonth.toISOString().split('T')[0],
        }, {
          onConflict: 'user_id,category,month',
        });

      if (error) throw error;

      // Update local state
      setCategoryBudgets(prev => ({
        ...prev,
        [category]: amount,
      }));

    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const calculateRemaining = (category) => {
    const budget = parseFloat(categoryBudgets[category] || 0);
    const spent = categorySpending[category] || 0;
    return budget - spent;
  };

  const getProgressColor = (spent, budget) => {
    if (budget === 0) return '#94A3B8';
    const percentage = (spent / budget) * 100;
    if (percentage > 90) return '#EF4444';
    if (percentage > 70) return '#F59E0B';
    return '#10B981';
  };

  const formatCurrency = (amount) => {
    return `₦${parseFloat(amount).toFixed(2)}`;
  };

  const renderCategoryBudget = (category) => {
    const budget = parseFloat(categoryBudgets[category] || 0);
    const spent = categorySpending[category] || 0;
    const remaining = calculateRemaining(category);
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;

    return (
      <View key={category} style={styles.categoryCard}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryInfo}>
            <View style={[styles.categoryDot, { backgroundColor: COLORS[category.toUpperCase()] }]} />
            <Text style={styles.categoryName}>{category}</Text>
          </View>
          <Text style={styles.categoryBudget}>
            {formatCurrency(budget)}
          </Text>
        </View>

        <ProgressBar
          progress={budget > 0 ? spent / budget : 0}
          color={getProgressColor(spent, budget)}
          style={styles.categoryProgress}
        />

        <View style={styles.categoryDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Spent</Text>
            <Text style={[styles.detailValue, { color: '#1E293B' }]}>
              {formatCurrency(spent)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Remaining</Text>
            <Text style={[
              styles.detailValue,
              { color: remaining >= 0 ? '#10B981' : '#EF4444' }
            ]}>
              {formatCurrency(remaining)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Used</Text>
            <Text style={styles.detailValue}>
              {percentage.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.budgetInputContainer}>
          <TextInput
            style={styles.budgetInput}
            placeholder="Set budget..."
            value={categoryBudgets[category] || ''}
            onChangeText={(value) => setCategoryBudgets(prev => ({
              ...prev,
              [category]: value,
            }))}
            keyboardType="decimal-pad"
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => saveCategoryBudget(category, categoryBudgets[category] || '0')}
          >
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Budget Planning</Text>
          <Text style={styles.subtitle}>Manage your monthly spending limits</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadBudgetData}>
          <Ionicons name="refresh" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Monthly Budget Card */}
      <View style={styles.monthlyBudgetCard}>
        <View style={styles.monthlyBudgetHeader}>
          <View>
            <Text style={styles.monthlyBudgetTitle}>Monthly Budget</Text>
            <Text style={styles.monthlyBudgetDate}>
              {new Date().toLocaleDateString('default', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          <Text style={styles.monthlyBudgetAmount}>
            {formatCurrency(monthlyBudget)}
          </Text>
        </View>

        

        <View style={styles.monthlyBudgetInputContainer}>
          <TextInput
            style={styles.monthlyBudgetInput}
            placeholder="Set monthly budget..."
            value={monthlyBudget}
            onChangeText={setMonthlyBudget}
            keyboardType="decimal-pad"
            placeholderTextColor="#94A3B8"
          />
          <TouchableOpacity
            style={[styles.monthlySaveButton, loading && styles.buttonDisabled]}
            onPress={saveMonthlyBudget}
            disabled={loading}
          >
            <Text style={styles.monthlySaveButtonText}>
              {loading ? 'Saving...' : 'Update'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

     

      {/* Budget Tips */}
      <View style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Ionicons name="bulb" size={24} color="#F59E0B" />
          <Text style={styles.tipsTitle}>Budgeting Tips</Text>
        </View>
        
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.tipText}>
            Start with your fixed expenses (rent, tuition)
          </Text>
        </View>
        
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.tipText}>
            Allocate 20-30% for flexible spending
          </Text>
        </View>
        
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.tipText}>
            Review and adjust budgets monthly
          </Text>
        </View>
        
        <View style={styles.tipItem}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.tipText}>
            Save 10-20% of your income if possible
          </Text>
        </View>
      </View>

      {/* Quick Budget Templates */}
      <View style={styles.templatesCard}>
        <Text style={styles.templatesTitle}>Quick Budget Templates</Text>
        <View style={styles.templatesGrid}>
          <TouchableOpacity
            style={styles.templateButton}
            onPress={() => {
              setMonthlyBudget('50000');
              Alert.alert('Applied', 'Basic student budget template applied');
            }}
          >
            <Text style={styles.templateAmount}>₦50,000</Text>
            <Text style={styles.templateLabel}>Basic Student</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.templateButton}
            onPress={() => {
              setMonthlyBudget('100000');
              Alert.alert('Applied', 'Moderate budget template applied');
            }}
          >
            <Text style={styles.templateAmount}>₦100,000</Text>
            <Text style={styles.templateLabel}>Moderate</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.templateButton}
            onPress={() => {
              setMonthlyBudget('200000');
              Alert.alert('Applied', 'Comfortable budget template applied');
            }}
          >
            <Text style={styles.templateAmount}>₦200,000</Text>
            <Text style={styles.templateLabel}>Comfortable</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  refreshButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthlyBudgetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  monthlyBudgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  monthlyBudgetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  monthlyBudgetDate: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  monthlyBudgetAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  progressContainer: {
    marginBottom: 20,
  },
  monthlyProgress: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#64748B',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  monthlyBudgetInputContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  monthlyBudgetInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  monthlySaveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  monthlySaveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  budgetInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  budgetInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
  },
  saveButton: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  tipsCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  templatesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  templatesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  templatesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  templateButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  templateAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  templateLabel: {
    fontSize: 12,
    color: '#64748B',
  },
});