// screens/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { ProgressBar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase, COLORS, CATEGORIES, formatCurrency, generateSmartInsights, predictNextWeekSpending } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmartRecommendations from '../components/SmartRecommendations';
import PredictiveAnalytics from '../components/PredictiveAnalytics';

const screenWidth = Dimensions.get('window').width;

export default function DashboardScreen({ navigation }) {
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [budget, setBudget] = useState(0);
  const [categoryData, setCategoryData] = useState([]);
  const [insights, setInsights] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [userData, setUserData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [selectedMonth]);

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const current = new Date();
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    // Prevent navigating into future months
    if (next.getFullYear() > current.getFullYear() || (next.getFullYear() === current.getFullYear() && next.getMonth() > current.getMonth())) {
      return;
    }
    setSelectedMonth(next);
  };
  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      // Get user data including budget
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData) {
        setBudget(Number(userData.monthly_budget) || 0);  // FIX: Convert to number
        setUserData(userData);
      }

      // Get expenses for the month
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0]);

      // Load offline expenses
      const offlineKey = `offline_expenses_${user.id}`;
      const offlineExpensesJSON = await AsyncStorage.getItem(offlineKey);
      const offlineExpenses = offlineExpensesJSON ? JSON.parse(offlineExpensesJSON) : [];

      // Filter offline expenses for current month
      const filteredOffline = offlineExpenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      });

      // Combine and sort
      const allExpenses = [...(expenses || []), ...filteredOffline].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setExpenses(allExpenses);

      // Calculate totals
      let total = 0;
      const categoryTotals = {};
      Object.values(CATEGORIES).forEach(cat => {
        categoryTotals[cat] = 0;
      });

      if (allExpenses) {
        allExpenses.forEach(expense => {
          total += parseFloat(expense.amount);
          categoryTotals[expense.category] += parseFloat(expense.amount);
        });
      }

      setMonthlyTotal(total);

      // Prepare chart data
      const chartData = Object.keys(categoryTotals)
        .filter(cat => categoryTotals[cat] > 0)
        .map((cat, index) => ({
          name: cat,
          population: categoryTotals[cat],
          color: COLORS[cat.toUpperCase()] || COLORS.MISC,
          legendFontColor: '#7F7F7F',
          legendFontSize: 12,
        }));

      setCategoryData(chartData);

      // Generate smart insights using AI
      const smartInsights = await generateSmartInsights(allExpenses, budget || 0, userData);
      setInsights(smartInsights);

      // Generate predictions
      const nextWeekPrediction = predictNextWeekSpending(allExpenses);
      setPredictions({
        nextWeek: nextWeekPrediction,
        categoryTotals,
        totalExpenses: allExpenses.length
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const budgetPercentage = budget > 0 ? (monthlyTotal / budget) * 100 : 0;

  const handleInsightAction = (insight) => {
    switch (insight.type) {
      case 'warning':
        Alert.alert(
          insight.title,
          insight.message + '\n\nWould you like to adjust your budget?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Adjust Budget', onPress: () => navigation.navigate('Budget') }
          ]
        );
        break;
      case 'suggestion':
        Alert.alert(
          'AI Suggestion',
          insight.message,
          [{ text: 'Got it' }]
        );
        break;
      default:
        Alert.alert(insight.title, insight.message);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage > 90) return '#EF4444';
    if (percentage > 70) return '#F59E0B';
    return '#10B981';
  };

  const isCurrentMonth = () => {
    const current = new Date();
    return selectedMonth.getFullYear() === current.getFullYear() &&
           selectedMonth.getMonth() === current.getMonth();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Smart Dashboard</Text>
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={handlePreviousMonth} style={styles.monthButton}>
              <Ionicons name="chevron-back" size={24} color="#6366F1" />
            </TouchableOpacity>
            <Text style={styles.headerSubtitle}>
              {selectedMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} disabled={isCurrentMonth()} style={styles.monthButton}>
              <Ionicons name="chevron-forward" size={24} color={isCurrentMonth() ? '#CBD5E1' : '#6366F1'} />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => navigation.navigate('Insights')}
          disabled={refreshing}
        >
          <Ionicons name="sparkles" size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Budget Progress with AI Warning */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Budget Overview</Text>
          <Text style={styles.cardAmount}>{formatCurrency(budget)}</Text>
        </View>

        <ProgressBar
          progress={budgetPercentage / 100}
          color={getProgressColor(budgetPercentage)}
          style={styles.progressBar}
        />

        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            Spent: {formatCurrency(monthlyTotal)}
          </Text>
          <Text style={[styles.progressPercentage, { color: getProgressColor(budgetPercentage) }]}>
            {budgetPercentage.toFixed(1)}%
          </Text>
        </View>

        {budgetPercentage > 100 && (
          <View style={styles.overBudgetWarning}>
            <Ionicons name="warning" size={16} color="#EF4444" />
            <Text style={styles.warningText}>
              Over budget by {formatCurrency(monthlyTotal - budget)}
            </Text>
          </View>
        )}

        {budgetPercentage > 80 && budgetPercentage <= 100 && (
          <View style={styles.nearBudgetWarning}>
            <Ionicons name="alert-circle" size={16} color="#F59E0B" />
            <Text style={styles.nearWarningText}>
              Close to budget limit. {formatCurrency(budget - monthlyTotal)} remaining.
            </Text>
          </View>
        )}
      </View>

      {/* Smart AI Recommendations */}
      {insights.length > 0 && (
        <SmartRecommendations
          insights={insights.slice(0, 3)}
          onActionPress={handleInsightAction}
        />
      )}

      {/* Predictive Analytics */}
      {predictions && (
        <PredictiveAnalytics
          expenses={expenses}
          budget={Number(budget) || 0}  // FIX: Convert to number
          monthlyTotal={Number(monthlyTotal) || 0}
        />
      )}

      {/* Spending Chart */}
      {categoryData.length > 0 && (
        <View style={styles.card}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>Spending by Category</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <PieChart
            data={categoryData}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      )}

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: '#F0F9FF' }]}>
          <Ionicons name="calendar" size={24} color="#0369A1" />
          <Text style={[styles.statValue, { color: '#0369A1' }]}>
            {new Date().getDate()}
          </Text>
          <Text style={styles.statLabel}>Day of Month</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="trending-up" size={24} color="#16A34A" />
          <Text style={[styles.statValue, { color: '#16A34A' }]}>
            {formatCurrency(monthlyTotal)}
          </Text>
          <Text style={styles.statLabel}>Total Spent</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="pricetags" size={24} color="#D97706" />
          <Text style={[styles.statValue, { color: '#D97706' }]}>
            {categoryData.length}
          </Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
      </View>

      {/* Daily Spending Trend */}
      {expenses.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Spending Trend</Text>
          <View style={styles.dailyTrend}>
            {Array.from({ length: 7 }).map((_, index) => {
              const day = new Date();
              day.setDate(day.getDate() - (6 - index));
              const dayExpenses = expenses.filter(exp => {
                const expDate = new Date(exp.date);
                return expDate.getDate() === day.getDate() &&
                  expDate.getMonth() === day.getMonth() &&
                  expDate.getFullYear() === day.getFullYear();
              });
              const dayTotal = dayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
              const maxHeight = 60;
              const height = Math.min((dayTotal / 5000) * maxHeight, maxHeight);

              return (
                <View key={index} style={styles.dayColumn}>
                  <View style={[styles.dayBar, { height, backgroundColor: dayTotal > 3000 ? '#EF4444' : '#10B981' }]} />
                  <Text style={styles.dayLabel}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.dayAmount}>{formatCurrency(dayTotal)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Tips with AI Context */}
      <View style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Ionicons name="school" size={24} color="#6366F1" />
          <Text style={styles.tipsTitle}>Smart Student Tips</Text>
        </View>
        {insights.length > 0 && insights[0].type === 'warning' ? (
          <>
            <Text style={styles.tipText}>
              • Your spending is high. Consider cooking at home more often
            </Text>
            <Text style={styles.tipText}>
              • Use public transport instead of ride-sharing
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.tipText}>
              • Great job! Your spending is under control
            </Text>
            <Text style={styles.tipText}>
              • Consider setting aside 10% for savings
            </Text>
          </>
        )}
        <Text style={styles.tipText}>
          • Always use student discounts when available
        </Text>
      </View>

      {/* Add Expense Quick Button */}
     
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  monthButton: {
    padding: 4,
  },
  aiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  progressBar: {
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
  },
  overBudgetWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    gap: 8,
  },
  nearBudgetWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '500',
  },
  nearWarningText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  dailyTrend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    marginTop: 16,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayBar: {
    width: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  dayAmount: {
    fontSize: 10,
    color: '#1E293B',
    fontWeight: '500',
  },
  tipsCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4F46E5',
  },
  tipText: {
    fontSize: 14,
    color: '#4F46E5',
    marginBottom: 8,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    gap: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});