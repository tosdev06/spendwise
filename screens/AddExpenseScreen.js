import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase, CATEGORIES, COLORS, smartCategorizeExpense, generateSmartDescription, AILearningSystem } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AI categorization keywords
const CATEGORY_KEYWORDS = {
  [CATEGORIES.FOOD]: ['burger', 'pizza', 'restaurant', 'cafe', 'coffee', 'groceries', 'food', 'lunch', 'dinner', 'breakfast', 'snack'],
  [CATEGORIES.TRANSPORT]: ['uber', 'lyft', 'taxi', 'bus', 'train', 'metro', 'gas', 'fuel', 'parking', 'ticket', 'transport'],
  [CATEGORIES.ACADEMICS]: ['textbook', 'book', 'tuition', 'course', 'software', 'stationery', 'pen', 'notebook', 'library', 'research'],
  [CATEGORIES.ENTERTAINMENT]: ['movie', 'netflix', 'spotify', 'game', 'concert', 'party', 'drinks', 'bar', 'club', 'event'],
  [CATEGORIES.MISC]: ['shopping', 'clothes', 'gift', 'donation', 'repair', 'service', 'fee'],
};

export default function AddExpenseScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES.FOOD);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [categoryAlternatives, setCategoryAlternatives] = useState([]);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [aiLearning, setAiLearning] = useState(null);
  const [recentCategories, setRecentCategories] = useState([]);

  useEffect(() => {
    // Check network connectivity
    const checkConnection = async () => {
      // In production, use NetInfo from @react-native-community/netinfo
      setIsOnline(navigator.onLine);
    };
    checkConnection();

    // Initialize AI learning system
    initAiLearning();
  }, []);

  useEffect(() => {
    if (description) {
      suggestCategory(description);
    }
  }, [description]);

  useEffect(() => {
    loadRecentCategories();
  }, []);

  const initAiLearning = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const learningSystem = new AILearningSystem(user.id);
        await learningSystem.loadLearningData();
        setAiLearning(learningSystem);
      }
    } catch (error) {
      console.error('Error initializing AI learning:', error);
    }
  };

  const loadRecentCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: expenses } = await supabase
        .from('expenses')
        .select('category')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (expenses) {
        const categoryCount = {};
        expenses.forEach(exp => {
          categoryCount[exp.category] = (categoryCount[exp.category] || 0) + 1;
        });

        const sortedCategories = Object.entries(categoryCount)
          .sort((a, b) => b[1] - a[1])
          .map(([cat]) => cat)
          .slice(0, 3);

        setRecentCategories(sortedCategories);
      }
    } catch (error) {
      console.error('Error loading recent categories:', error);
    }
  };

  const suggestCategory = (text) => {
    if (!text.trim()) {
      setSuggestedCategory(null);
      setCategoryAlternatives([]);
      setConfidenceScore(0);
      return;
    }

    const amountNum = parseFloat(amount) || 0;
    const categorization = smartCategorizeExpense(text, amountNum, {
      hints: recentCategories,
      month: new Date().getMonth()
    });

    setSuggestedCategory(categorization.primary);
    setCategoryAlternatives(categorization.alternatives);
    setConfidenceScore(categorization.confidence);

    // Auto-apply if confidence is high and user hasn't manually selected a category
    if (categorization.confidence > 3 && category === CATEGORIES.FOOD) {
      setCategory(categorization.primary);
      Alert.alert(
        'AI Suggestion Applied',
        `Auto-categorized as "${categorization.primary}" with ${categorization.confidence.toFixed(1)} confidence`,
        [{ text: 'OK' }]
      );
    }
  };

  const applySuggestion = () => {
    if (suggestedCategory) {
      setCategory(suggestedCategory);
      Alert.alert(
        'AI Suggestion Applied',
        `Category set to "${suggestedCategory}"`,
        [{ text: 'OK' }]
      );
      // Learn from user acceptance
      if (aiLearning && description) {
        aiLearning.learnFromUserCorrection(description, suggestedCategory, {
          suggested: suggestedCategory,
          confidence: confidenceScore
        });
      }
    }
  };

  const handleCategorySelect = (selectedCategory) => {
    setCategory(selectedCategory);

    // Learn from user selection if different from AI suggestion
    if (aiLearning && description && suggestedCategory && selectedCategory !== suggestedCategory) {
      aiLearning.learnFromUserCorrection(description, selectedCategory, {
        suggested: suggestedCategory,
        confidence: confidenceScore
      });

      Alert.alert(
        'AI Learning',
        `Thanks for the correction! AI will remember this for "${description}"`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const saveExpenseLocally = async (expenseData, userId) => {
    if (!userId) {
      console.error('Cannot save locally without a user ID.');
      return null;
    }
    try {
      const offlineKey = `offline_expenses_${userId}`;
      const syncQueueKey = 'sync_queue';

      const savedExpenses = await AsyncStorage.getItem(offlineKey);
      const expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
      const localId = `local_${Date.now()}`;

      expenses.push({
        ...expenseData,
        local_id: localId,
        is_synced: false, // Explicitly mark as not synced
        created_at: new Date().toISOString(),
      });

      await AsyncStorage.setItem(offlineKey, JSON.stringify(expenses));

      // Add to sync queue
      const syncQueue = await AsyncStorage.getItem(syncQueueKey);
      const queue = syncQueue ? JSON.parse(syncQueue) : [];
      queue.push({
        table_name: 'expenses',
        operation: 'INSERT',
        data: { ...expenseData, is_synced: false }, // Ensure data in queue is marked as not synced
        local_id: localId,
        user_id: userId,
        created_at: new Date().toISOString(),
      });

      await AsyncStorage.setItem(syncQueueKey, JSON.stringify(queue));

      return localId;
    } catch (error) {
      console.error('Error saving locally:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!amount || !category || !description) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in first');
        navigation.replace('Auth');
        return;
      }

      // Check if budget is set in the user's profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('monthly_budget, category_budgets')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      if (!userData || !userData.monthly_budget || userData.monthly_budget <= 0) {
        Alert.alert(
          'Budget Not Set',
          'Please set a monthly budget before adding an expense.',
          [{ text: 'OK', onPress: () => navigation.navigate('Budget') }]
        );
        return;
      }

      const categoryBudget = userData.category_budgets?.[category];
      if (categoryBudget && categoryBudget > 0) {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

        const { data: categoryExpenses, error: categoryError } = await supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', user.id)
          .eq('category', category)
          .gte('date', monthStart)
          .lte('date', monthEnd);

        if (categoryError) throw categoryError;

        const currentCategorySpending = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const projectedSpending = currentCategorySpending + amountNum;

        if (projectedSpending > categoryBudget) {
          Alert.alert(
            'AI Budget Warning',
            `Adding this expense will put you ₦${(projectedSpending - categoryBudget).toFixed(2)} over your budget for the "${category}" category. Do you want to proceed?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => { setLoading(false); return; } },
              { text: 'Add Anyway', onPress: () => continueSubmit(expenseData, user) },
            ]
          );
          return; // Stop the regular submission flow
        }
      }

      const expenseData = {
        user_id: user.id,
        amount: amountNum,
        category,
        description,
        date: date.toISOString().split('T')[0],
        is_synced: true, // Assume online save will succeed initially
      };

      await continueSubmit(expenseData, user);

    } catch (error) {
      Alert.alert('Error', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const continueSubmit = async (expenseData, user) => {
    setLoading(true);
    let savedSuccessfully = false;
    try {
      // Always try to save to Supabase first
      const { error: supabaseError } = await supabase
        .from('expenses')
        .insert([expenseData]);

      if (supabaseError) {
        console.warn('Supabase save failed, attempting local save:', supabaseError.message);
        // If Supabase save fails, save locally
        const localId = await saveExpenseLocally({ ...expenseData, is_synced: false }, user.id);
        if (localId) {
          Alert.alert(
            'Saved Offline',
            'Expense saved locally. It will sync when you\'re back online.'
          );
          savedSuccessfully = true;
        } else {
          throw new Error('Failed to save expense both online and offline.');
        }
      } else {
        Alert.alert('Success', 'Expense added successfully!');
        savedSuccessfully = true;
        // Update AI learning with successful categorization
        if (aiLearning && suggestedCategory === category) {
          await aiLearning.learnFromUserCorrection(description, category, {
            suggested: suggestedCategory,
            confidence: confidenceScore,
            wasCorrect: true
          });
        }
      }
    } catch (error) {
      Alert.alert('Error submitting expense', error.message);
    } finally {
      if (savedSuccessfully) {
        // Reset form only if saved successfully (either online or offline)
        setAmount('');
        setCategory(CATEGORIES.FOOD);
        setDescription('');
        setDate(new Date());
        setSuggestedCategory(null);
        setCategoryAlternatives([]);
        setConfidenceScore(0);

        // Navigate back after delay
        setTimeout(() => {
          navigation.navigate('Dashboard');
        }, 1500);
      }
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getConfidenceColor = (score) => {
    if (score > 3) return '#10B981'; // High confidence - green
    if (score > 2) return '#F59E0B'; // Medium confidence - yellow
    return '#EF4444'; // Low confidence - red
  };

  const getConfidenceText = (score) => {
    if (score > 3) return 'High Confidence';
    if (score > 2) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Add New Expense</Text>
        <View style={[styles.statusBadge, isOnline ? styles.onlineBadge : styles.offlineBadge]}>
          <Ionicons
            name={isOnline ? 'wifi' : 'cloud-offline'}
            size={14}
            color={isOnline ? '#FFFFFF' : '#1E293B'}
          />
          <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* AI Assistant Banner */}
      {suggestedCategory && confidenceScore > 0 && (
        <View style={styles.aiBanner}>
          <View style={styles.aiBannerContent}>
            <Ionicons name="sparkles" size={20} color="#F59E0B" />
            <View style={styles.aiBannerText}>
              <Text style={styles.aiBannerTitle}>AI Assistant</Text>
              <Text style={styles.aiBannerMessage}>
                Suggests "{suggestedCategory}" with{' '}
                <Text style={{ color: getConfidenceColor(confidenceScore), fontWeight: '600' }}>
                  {getConfidenceText(confidenceScore)}
                </Text>
              </Text>
            </View>
            <TouchableOpacity onPress={applySuggestion} style={styles.aiApplyButton}>
              <Text style={styles.aiApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Amount Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount *</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>₦</Text>
          <TextInput
            style={styles.amountInput}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      {/* Date Picker */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Date *</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#6366F1" />
          <Text style={styles.dateText}>{formatDate(date)}</Text>
          <Ionicons name="chevron-down" size={20} color="#94A3B8" />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>

      {/* Category Picker with AI Alternatives */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={category}
            onValueChange={handleCategorySelect}
            style={styles.picker}
            dropdownIconColor="#6366F1"
          >
            {Object.values(CATEGORIES).map((cat) => (
              <Picker.Item
                key={cat}
                label={cat}
                value={cat}
                color={COLORS[cat.toUpperCase()]}
              />
            ))}
          </Picker>
        </View>

        {/* AI Suggested Categories */}
        {categoryAlternatives.length > 0 && (
          <View style={styles.aiSuggestions}>
            <Text style={styles.aiSuggestionsTitle}>AI Suggestions:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.aiSuggestionsList}
            >
              {categoryAlternatives.slice(0, 3).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.aiSuggestionTag,
                    { backgroundColor: COLORS[cat.toUpperCase()] + '20' },
                    category === cat && styles.aiSuggestionTagActive,
                  ]}
                  onPress={() => handleCategorySelect(cat)}
                >
                  <Text
                    style={[
                      styles.aiSuggestionText,
                      { color: COLORS[cat.toUpperCase()] },
                      category === cat && styles.aiSuggestionTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Description with AI Smart Generation */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Description *</Text>
          {suggestedCategory && (
            <TouchableOpacity
              style={styles.suggestionBadge}
              onPress={applySuggestion}
            >
              <Ionicons name="bulb" size={14} color="#F59E0B" />
              <Text style={styles.suggestionText}>
                AI: {suggestedCategory}
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#F59E0B" />
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={styles.descriptionInput}
          placeholder="What did you spend on? (e.g., 'Lunch at cafe', 'Uber ride')"
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            // Auto-generate description if empty and amount is entered
            if (!text.trim() && amount) {
              const smartDesc = generateSmartDescription(category, parseFloat(amount) || 0);
              setDescription(smartDesc);
            }
          }}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholderTextColor="#94A3B8"
        />
        <Text style={styles.hintText}>
          Tip: Include details for better AI categorization. AI learns from your corrections!
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Ionicons
          name={isOnline ? "cloud-upload" : "save"}
          size={24}
          color="#FFFFFF"
        />
        <Text style={styles.submitButtonText}>
          {loading ? 'Saving...' : isOnline ? 'Save Expense' : 'Save Offline'}
        </Text>
      </TouchableOpacity>

      {/* Quick Add Buttons */}
      <View style={styles.quickAddSection}>
        <Text style={styles.quickAddTitle}>Quick Add</Text>
        <View style={styles.quickAddGrid}>
          {[500, 1000, 2000, 5000].map((quickAmount) => (
            <TouchableOpacity
              key={quickAmount}
              style={styles.quickAddButton}
              onPress={() => setAmount(quickAmount.toString())}
            >
              <Text style={styles.quickAddText}>₦{quickAmount}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Categories from AI Learning */}
      {recentCategories.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Your Frequent Categories</Text>
          <View style={styles.recentGrid}>
            {recentCategories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={styles.recentItem}
                onPress={() => handleCategorySelect(cat)}
              >
                <View style={[styles.recentIcon, { backgroundColor: COLORS[cat.toUpperCase()] + '20' }]}>
                  <Ionicons
                    name={
                      cat === CATEGORIES.FOOD ? 'restaurant' :
                        cat === CATEGORIES.TRANSPORT ? 'car' :
                          cat === CATEGORIES.ACADEMICS ? 'school' :
                            cat === CATEGORIES.ENTERTAINMENT ? 'film' : 'cube'
                    }
                    size={20}
                    color={COLORS[cat.toUpperCase()]}
                  />
                </View>
                <Text style={styles.recentText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  onlineBadge: {
    backgroundColor: '#10B981',
  },
  offlineBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  onlineText: {
    color: '#FFFFFF',
  },
  offlineText: {
    color: '#92400E',
  },
  aiBanner: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  aiBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  aiBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 2,
  },
  aiBannerMessage: {
    fontSize: 12,
    color: '#92400E',
  },
  aiApplyButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  aiApplyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    paddingHorizontal: 16,
    backgroundColor: '#EEF2FF',
  },
  amountInput: {
    flex: 1,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: '#1E293B',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  picker: {
    height: 50,
  },
  aiSuggestions: {
    marginTop: 8,
  },
  aiSuggestionsTitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  aiSuggestionsList: {
    flexDirection: 'row',
  },
  aiSuggestionTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  aiSuggestionTagActive: {
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  aiSuggestionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  aiSuggestionTextActive: {
    fontWeight: '600',
  },
  suggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  suggestionText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  descriptionInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    marginBottom: 32,
    gap: 12,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  quickAddSection: {
    marginBottom: 32,
  },
  quickAddTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  quickAddGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAddButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  recentSection: {
    marginBottom: 32,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  recentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  recentItem: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  recentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
});