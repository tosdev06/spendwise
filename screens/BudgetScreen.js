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
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // This will hold the single budget record for the month
  const [budgetData, setBudgetData] = useState(null);

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user's monthly budget from the users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('monthly_budget, category_budgets')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (userData) {
        setBudgetData(userData); // The whole user object with budget info
        setMonthlyBudget(userData.monthly_budget ? userData.monthly_budget.toString() : '');
      } else {
        // No user data found
        setBudgetData(null);
        setMonthlyBudget('');
      }

    } catch (error) {
      console.error('Error loading budget data:', error);
    }
  };

  const saveBudget = async () => {
    const budgetValue = parseFloat(monthlyBudget);
    if (isNaN(budgetValue) || budgetValue < 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setLoading(true);

      // Update the monthly_budget in the users table
      const { error } = await supabase
        .from('users')
        .update({
          monthly_budget: budgetValue,
          // Persist existing category budgets
          category_budgets: budgetData?.category_budgets || {},
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Budget saved for the month!');
      loadBudgetData(); // Refresh the data
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (isNaN(parseFloat(amount))) return '₦0.00';
    return `₦${parseFloat(amount).toFixed(2)}`;
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
            {formatCurrency(budgetData?.monthly_budget || 0)}
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
            onPress={saveBudget}
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