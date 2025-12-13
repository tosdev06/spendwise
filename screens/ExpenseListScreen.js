import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { supabase, CATEGORIES, COLORS } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function ExpenseListScreen() {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    loadExpenses();
  }, [selectedMonth]);

  useEffect(() => {
    filterExpenses();
  }, [searchQuery, selectedCategory, expenses]);

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

  const loadExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      // Load from Supabase
      const { data: supabaseExpenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', monthStart.toISOString().split('T')[0])
        .lte('date', monthEnd.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

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
      const allExpenses = [...(supabaseExpenses || []), ...filteredOffline].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setExpenses(allExpenses);

      // Calculate total
      const total = allExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
      setTotalSpent(total);

    } catch (error) {
      console.error('Error loading expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    let filtered = [...expenses];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(expense =>
        expense.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(expense => expense.category === selectedCategory);
    }

    setFilteredExpenses(filtered);
  };

  const deleteExpense = async (expenseId, isLocal = false) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isLocal) {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const offlineKey = `offline_expenses_${user.id}`;
                // Delete from local storage
                const offlineExpensesJSON = await AsyncStorage.getItem(offlineKey);
                let offlineExpenses = offlineExpensesJSON ? JSON.parse(offlineExpensesJSON) : [];
                offlineExpenses = offlineExpenses.filter(exp => exp.local_id !== expenseId);
                await AsyncStorage.setItem(offlineKey, JSON.stringify(offlineExpenses));
              } else {
                // Delete from Supabase
                const { error } = await supabase
                  .from('expenses')
                  .delete()
                  .eq('id', expenseId);

                if (error) throw error;
              }

              // Update UI
              setExpenses(prev => prev.filter(exp =>
                (isLocal ? exp.local_id !== expenseId : exp.id !== expenseId)
              ));

              Alert.alert('Success', 'Expense deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const exportToCSV = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prepare CSV content
      let csvContent = 'Date,Category,Description,Amount\n';

      expenses.forEach(expense => {
        const row = [
          expense.date,
          expense.category,
          `"${expense.description?.replace(/"/g, '""') || ''}"`,
          expense.amount,
        ].join(',');
        csvContent += row + '\n';
      });

      // Save file
      const fileName = `expenses_${selectedMonth.getFullYear()}_${selectedMonth.getMonth() + 1}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Expenses',
        });
      } else {
        Alert.alert('Success', `File saved: ${fileUri}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export expenses');
    }
  };

  const formatCurrency = (amount) => {
    return `₦${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getCategoryColor = (category) => {
    return COLORS[category?.toUpperCase()] || COLORS.MISC;
  };

  const isCurrentMonth = () => {
    const current = new Date();
    return selectedMonth.getFullYear() === current.getFullYear() &&
      selectedMonth.getMonth() === current.getMonth();
  };

  // FIXED: Removed the extra ScrollView wrapper from renderExpenseItem
  const renderExpenseItem = ({ item }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseLeft}>
        <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(item.category) }]} />
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.expenseMeta}>
            <Text style={styles.expenseCategory}>{item.category}</Text>
            <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
            {!item.is_synced && (
              <View style={styles.offlineBadge}>
                <Ionicons name="cloud-offline" size={10} color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.expenseRight}>
        <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteExpense(item.id || item.local_id, !!item.local_id)}
        >
          <Ionicons name="trash" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt" size={64} color="#CBD5E1" />
      <Text style={styles.emptyStateTitle}>No expenses found</Text>
      <Text style={styles.emptyStateText}>
        {selectedCategory !== 'All'
          ? `No ${selectedCategory.toLowerCase()} expenses this month`
          : 'Add your first expense to get started'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Expenses</Text>
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
        <TouchableOpacity style={styles.exportButton} onPress={exportToCSV}>
          <Ionicons name="download" size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search expenses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color="#6366F1" />
          <Text style={styles.filterButtonText}>
            {selectedCategory !== 'All' ? selectedCategory : 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Expenses</Text>
          <Text style={styles.summaryValue}>{expenses.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>This Month</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalSpent)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Avg/Day</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(totalSpent / new Date().getDate())}
          </Text>
        </View>
      </View>

      {/* Category Quick Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryFilterItem,
            selectedCategory === 'All' && styles.categoryFilterItemActive,
          ]}
          onPress={() => setSelectedCategory('All')}
        >
          <Text
            style={[
              styles.categoryFilterText,
              selectedCategory === 'All' && styles.categoryFilterTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {Object.values(CATEGORIES).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryFilterItem,
              { backgroundColor: COLORS[cat.toUpperCase()] + '20' },
              selectedCategory === cat && styles.categoryFilterItemActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Ionicons
              name={
                cat === CATEGORIES.FOOD ? 'restaurant' :
                  cat === CATEGORIES.TRANSPORT ? 'car' :
                    cat === CATEGORIES.ACADEMICS ? 'school' :
                      cat === CATEGORIES.ENTERTAINMENT ? 'film' : 'cube'
              }
              size={16}
              color={COLORS[cat.toUpperCase()]}
              style={styles.categoryFilterIcon}
            />
            <Text
              style={[
                styles.categoryFilterText,
                { color: COLORS[cat.toUpperCase()] },
                selectedCategory === cat && styles.categoryFilterTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Expenses List */}
      <FlatList
        data={filteredExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={(item) => (item.id || item.local_id).toString()}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={loadExpenses}
        showsVerticalScrollIndicator={false}
        style={styles.expensesList}
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Expenses</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <Picker.Item label="All Categories" value="All" />
                  {Object.values(CATEGORIES).map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.modalLabel}>Sort By</Text>
              <View style={styles.sortOptions}>
                {['Date (Newest)', 'Date (Oldest)', 'Amount (High)', 'Amount (Low)'].map((option) => (
                  <TouchableOpacity key={option} style={styles.sortOption}>
                    <Text style={styles.sortOptionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                }}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
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
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    gap: 8,
  },
  filterButtonText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  categoryFilter: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  categoryFilterContent: {
    gap: 8,
    paddingRight: 16,
  },
  categoryFilterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  categoryFilterItemActive: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  categoryFilterIcon: {
    marginRight: 4,
  },
  categoryFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryFilterTextActive: {
    fontWeight: '600',
  },
  expensesList: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseCategory: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  offlineBadge: {
    backgroundColor: '#F59E0B',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  sortOptionText: {
    color: '#475569',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});