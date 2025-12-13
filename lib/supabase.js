import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://nxzzqjheyddmfkqwzoyu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54enpxamhleWRkbWZrcXd6b3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1ODA3NTAsImV4cCI6MjA4MTE1Njc1MH0.M0N-HS0hIJlWG7pgsJRRPC0JV1WEhTXEVApoFyb-odE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database schema helpers
export const TABLES = {
  USERS: 'users',
  EXPENSES: 'expenses',
  BUDGETS: 'budgets',
  SYNC_QUEUE: 'sync_queue',
};

export const CATEGORIES = {
  FOOD: 'Food',
  TRANSPORT: 'Transport',
  ACADEMICS: 'Academics',
  ENTERTAINMENT: 'Entertainment',
  MISC: 'Misc',
};

export const COLORS = {
  FOOD: '#FF6B6B',
  TRANSPORT: '#4ECDC4',
  ACADEMICS: '#45B7D1',
  ENTERTAINMENT: '#96CEB4',
  MISC: '#FFEAA7',
  primary: '#6366F1',
  secondary: '#8B5CF6',
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
};

// ============================================
// ENHANCED AI SYSTEM WITH MACHINE LEARNING
// ============================================

// Enhanced AI categorization with machine learning patterns
export const ENHANCED_AI_CATEGORY_KEYWORDS = {
  [CATEGORIES.FOOD]: {
    keywords: ['burger', 'pizza', 'restaurant', 'cafe', 'coffee', 'groceries', 'food', 'lunch', 'dinner', 'breakfast', 'snack', 'jollof', 'suya', 'amala', 'ewa', 'indomie', 'buka', 'rice', 'beans', 'chicken', 'meal'],
    patterns: [/^food/i, /^eat/i, /^meal/i, /^restaurant/i, /^cafe/i, /^kitchen/i, /^chop/i],
    priority: 1
  },
  [CATEGORIES.TRANSPORT]: {
    keywords: ['uber', 'bolt', 'taxi', 'bus', 'train', 'metro', 'gas', 'fuel', 'parking', 'ticket', 'transport', 'okada', 'keke', 'danfo', 'drive', 'journey', 'fare', 'commute', 'transportation'],
    patterns: [/^transport/i, /^commute/i, /^travel/i, /^ride/i, /^fuel/i, /^parking/i, /^go/i],
    priority: 2
  },
  [CATEGORIES.ACADEMICS]: {
    keywords: ['textbook', 'book', 'tuition', 'course', 'software', 'stationery', 'pen', 'notebook', 'library', 'research', 'exam', 'assignment', 'project', 'handout', 'school', 'university', 'lecture', 'study', 'material', 'fee'],
    patterns: [/^school/i, /^study/i, /^academic/i, /^tuition/i, /^book/i, /^exam/i, /^learn/i],
    priority: 3
  },
  [CATEGORIES.ENTERTAINMENT]: {
    keywords: ['movie', 'netflix', 'spotify', 'game', 'concert', 'party', 'drinks', 'bar', 'club', 'event', 'cinema', 'show', 'music', 'hangout', 'fun', 'entertain', 'game', 'outing', 'enjoy'],
    patterns: [/^entertain/i, /^fun/i, /^movie/i, /^game/i, /^party/i, /^music/i, /^enjoy/i],
    priority: 4
  },
  [CATEGORIES.MISC]: {
    keywords: ['shopping', 'clothes', 'gift', 'donation', 'repair', 'service', 'fee', 'phone', 'data', 'airtime', 'internet', 'buy', 'purchase', 'shop', 'item', 'thing', 'stuff'],
    patterns: [/^shop/i, /^buy/i, /^purchase/i, /^service/i, /^fee/i, /^get/i],
    priority: 5
  }
};

// Smart AI Insights Generator
export async function generateSmartInsights(expenses, budget, userData) {
  const insights = [];
  
  if (!expenses || expenses.length === 0) {
    return [{
      type: 'info',
      icon: '📊',
      title: 'Welcome to Smart Expense Tracking',
      message: 'Add your first expense to get AI-powered insights and recommendations.',
      priority: 1,
      action: 'Add Expense'
    }];
  }

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Analyze spending patterns
  const monthlyAnalysis = analyzeMonthlyTrends(expenses);
  const categoryAnalysis = analyzeCategoryPatterns(expenses);
  const behavioralPatterns = detectBehavioralPatterns(expenses);
  const anomalyDetection = detectAnomalies(expenses);
  
  // Budget insights
  const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysPassed = today.getDate();
  const dailyBudget = budget / daysInMonth;
  const dailyAverage = totalSpent / daysPassed;
  
  // Adaptive budget recommendations based on spending patterns
  const adaptiveRecommendations = generateAdaptiveRecommendations(
    expenses,
    budget,
    userData?.monthly_income || 0
  );
  
  // Add budget-related insights
  if (budget > 0) {
    const budgetUsage = (totalSpent / budget) * 100;
    const projectedMonthlyTotal = (dailyAverage * daysInMonth);
    const daysLeft = daysInMonth - daysPassed;
    const remainingBudget = budget - totalSpent;
    const dailyAllowance = remainingBudget / daysLeft;
    
    // Smart budget insight
    insights.push({
      type: budgetUsage > 85 ? 'warning' : budgetUsage > 60 ? 'suggestion' : 'positive',
      icon: budgetUsage > 85 ? '⚠️' : budgetUsage > 60 ? '📈' : '🎯',
      title: budgetUsage > 85 ? 'Budget Alert' : budgetUsage > 60 ? 'Spending Pace' : 'On Track',
      message: budgetUsage > 85 
        ? `You've used ${budgetUsage.toFixed(1)}% of your budget. Spend max ₦${dailyAllowance.toFixed(0)}/day to stay on budget.`
        : budgetUsage > 60
        ? `Projected: ₦${projectedMonthlyTotal.toFixed(0)} (${((projectedMonthlyTotal/budget)*100).toFixed(1)}% of budget). ${daysLeft} days left.`
        : `Great! You're using ${budgetUsage.toFixed(1)}% of budget. Keep it up!`,
      priority: 1,
      data: { budgetUsage, projectedMonthlyTotal, dailyAllowance }
    });
  }
  
  // Anomaly detection insights
  if (anomalyDetection.unusualExpenses.length > 0) {
    insights.push({
      type: 'warning',
      icon: '🔍',
      title: 'Unusual Spending Detected',
      message: `Found ${anomalyDetection.unusualExpenses.length} expense(s) significantly higher than your average.`,
      priority: 1,
      data: anomalyDetection
    });
  }
  
  // Pattern-based insights
  if (behavioralPatterns.weekendSpendingRatio > 0.4) {
    insights.push({
      type: 'suggestion',
      icon: '🎉',
      title: 'Weekend Habits',
      message: `You spend ${(behavioralPatterns.weekendSpendingRatio * 100).toFixed(1)}% on weekends. Consider planning weekend expenses in advance.`,
      priority: 2,
      data: behavioralPatterns
    });
  }
  
  if (behavioralPatterns.lateMonthSpending > 0.3) {
    insights.push({
      type: 'warning',
      icon: '📅',
      title: 'End-of-Month Crunch',
      message: `${(behavioralPatterns.lateMonthSpending * 100).toFixed(1)}% of spending happens in the last week. Try spreading expenses evenly.`,
      priority: 2
    });
  }
  
  // Smart category insights
  const topCategory = categoryAnalysis.topSpendingCategory;
  if (topCategory) {
    const categoryPercentage = (topCategory.amount / totalSpent) * 100;
    
    if (categoryPercentage > 40) {
      insights.push({
        type: 'suggestion',
        icon: '🎯',
        title: 'Category Focus',
        message: `${topCategory.name} accounts for ${categoryPercentage.toFixed(1)}% of spending. Consider if this aligns with your priorities.`,
        priority: 3,
        data: { category: topCategory.name, percentage: categoryPercentage }
      });
    }
    
    // Compare with previous month if available
    if (monthlyAnalysis.previousMonthTotal > 0) {
      const previousMonthCategory = monthlyAnalysis.previousMonthCategory?.[topCategory.name] || 0;
      if (previousMonthCategory > 0) {
        const growth = ((topCategory.amount - previousMonthCategory) / previousMonthCategory) * 100;
        
        if (Math.abs(growth) > 30) {
          insights.push({
            type: growth > 0 ? 'warning' : 'positive',
            icon: growth > 0 ? '📈' : '📉',
            title: `${topCategory.name} ${growth > 0 ? 'Increase' : 'Decrease'}`,
            message: `${topCategory.name} spending ${growth > 0 ? 'increased' : 'decreased'} by ${Math.abs(growth).toFixed(1)}% from last month.`,
            priority: 3
          });
        }
      }
    }
  }
  
  // Savings opportunity insight
  const savingsPotential = detectSavingsPotential(expenses, categoryAnalysis);
  if (savingsPotential > 0) {
    insights.push({
      type: 'positive',
      icon: '💰',
      title: 'Savings Opportunity',
      message: `Potential savings: ₦${savingsPotential.toFixed(0)} by optimizing ${categoryAnalysis.topSpendingCategory?.name} spending.`,
      priority: 4
    });
  }
  
  // Predictive insights
  const predictedNextWeek = predictNextWeekSpending(expenses);
  if (predictedNextWeek) {
    insights.push({
      type: 'info',
      icon: '🔮',
      title: 'Next Week Prediction',
      message: `Based on your patterns, next week's spending might be around ₦${predictedNextWeek.toFixed(0)}`,
      priority: 4,
      data: { prediction: predictedNextWeek }
    });
  }
  
  // Add adaptive recommendations
  insights.push(...adaptiveRecommendations);
  
  // Sort by priority and return
  return insights.sort((a, b) => a.priority - b.priority);
}

// Enhanced AI categorization with machine learning
export function smartCategorizeExpense(description, amount, context = {}) {
  if (!description || typeof description !== 'string') {
    return {
      primary: CATEGORIES.MISC,
      alternatives: Object.values(CATEGORIES),
      confidence: 0
    };
  }

  const lowerDesc = description.toLowerCase().trim();
  let bestMatch = { category: CATEGORIES.MISC, confidence: 0 };
  const contextHints = context.hints || [];
  const currentMonth = context.month !== undefined ? context.month : new Date().getMonth();
  
  // Check category keywords with weighted scoring
  Object.entries(ENHANCED_AI_CATEGORY_KEYWORDS).forEach(([category, data]) => {
    let score = 0;
    
    // Keyword matching with frequency weighting
    data.keywords.forEach(keyword => {
      if (lowerDesc.includes(keyword)) {
        score += 1.0;
        // If keyword appears multiple times, increase score
        const occurrences = (lowerDesc.match(new RegExp(keyword, 'g')) || []).length;
        score += (occurrences - 1) * 0.5;
      }
    });
    
    // Pattern matching with regex
    data.patterns.forEach(pattern => {
      if (pattern.test(lowerDesc)) {
        score += 1.5;
      }
    });
    
    // Amount-based hints for Nigerian context
    if (amount > 0) {
      if (category === CATEGORIES.FOOD) {
        if (amount < 2000) score += 0.5; // Small food expense
        if (amount > 10000) score += 1.0; // Large food expense
      }
      if (category === CATEGORIES.TRANSPORT) {
        if (amount < 1000) score += 0.5; // Short trip
        if (amount > 5000) score += 1.0; // Long trip
      }
      if (category === CATEGORIES.ACADEMICS && amount > 5000) score += 1.5; // Academic materials are usually expensive
      if (category === CATEGORIES.ENTERTAINMENT && amount > 3000) score += 0.5;
    }
    
    // Context hints from user behavior
    if (contextHints.includes(category)) score += 2.0;
    
    // Time-based context for Nigerian academic calendar
    // School fees typically paid in Jan-Feb (second semester) and Aug-Sep (first semester)
    if ([0, 1, 7, 8].includes(currentMonth)) { // Jan, Feb, Aug, Sep
      if (category === CATEGORIES.ACADEMICS) {
        if (lowerDesc.includes('fee') || lowerDesc.includes('school') || lowerDesc.includes('tuition')) {
          score += 3.0;
        }
      }
    }
    
    // Nigerian-specific patterns
    if (category === CATEGORIES.FOOD) {
      if (lowerDesc.includes('jollof') || lowerDesc.includes('suya') || lowerDesc.includes('amala') || 
          lowerDesc.includes('indomie') || lowerDesc.includes('buka')) {
        score += 2.0;
      }
    }
    
    if (category === CATEGORIES.TRANSPORT) {
      if (lowerDesc.includes('okada') || lowerDesc.includes('keke') || lowerDesc.includes('danfo')) {
        score += 2.0;
      }
    }
    
    if (score > bestMatch.confidence) {
      bestMatch = { category, confidence: score };
    }
  });
  
  // If confidence is low, return multiple suggestions
  if (bestMatch.confidence < 2) {
    return {
      primary: CATEGORIES.MISC,
      alternatives: Object.values(CATEGORIES),
      confidence: bestMatch.confidence
    };
  }
  
  return {
    primary: bestMatch.category,
    alternatives: getAlternativeCategories(bestMatch.category, bestMatch.confidence),
    confidence: bestMatch.confidence
  };
}

// Smart expense description generator
export function generateSmartDescription(category, amount) {
  const descriptions = {
    [CATEGORIES.FOOD]: [
      `Food: ${amount < 1000 ? 'Quick snack' : amount < 3000 ? 'Regular meal' : 'Special dining'}`,
      `${getTimeBasedMealDescription()}: ${amount < 1500 ? 'Affordable' : 'Premium'} meal`,
      `Food purchase: ₦${amount.toFixed(2)}`
    ],
    [CATEGORIES.TRANSPORT]: [
      `Transport: ${amount < 500 ? 'Short trip' : amount < 2000 ? 'Regular commute' : 'Long distance'}`,
      `${getTransportType(amount)} transport`,
      `Commute: ₦${amount.toFixed(2)}`
    ],
    [CATEGORIES.ACADEMICS]: [
      `Academic: ${amount < 5000 ? 'Study materials' : 'Course expenses'}`,
      `School ${amount > 10000 ? 'major ' : ''}expense`,
      `Education: ₦${amount.toFixed(2)}`
    ],
    [CATEGORIES.ENTERTAINMENT]: [
      `Entertainment: ${amount < 2000 ? 'Small leisure' : 'Entertainment activity'}`,
      `Leisure & ${amount < 5000 ? 'fun' : 'enjoyment'}`,
      `Fun activity: ₦${amount.toFixed(2)}`
    ],
    [CATEGORIES.MISC]: [
      `Miscellaneous expense`,
      `Other purchase: ₦${amount.toFixed(2)}`,
      `General expense`
    ]
  };
  
  const options = descriptions[category] || [`Expense: ₦${amount.toFixed(2)}`];
  return options[Math.floor(Math.random() * options.length)];
}

// ============================================
// ANALYTICS & PREDICTIVE FUNCTIONS
// ============================================

// Predictive analytics
export function predictNextWeekSpending(expenses) {
  const lastMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return expDate >= oneMonthAgo;
  });
  
  if (lastMonthExpenses.length < 5) return null;
  
  // Simple moving average of last 4 weeks
  const weeklyAverages = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekExpenses = lastMonthExpenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= weekStart && expDate < weekEnd;
    });
    
    const weekTotal = weekExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    weeklyAverages.push(weekTotal);
  }
  
  const average = weeklyAverages.reduce((sum, val) => sum + val, 0) / weeklyAverages.length;
  return average * (1 + (Math.random() * 0.2 - 0.1)); // Add slight random variation
}

function analyzeMonthlyTrends(expenses) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const currentMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });
  
  const previousMonthExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    return expDate.getMonth() === prevMonth && expDate.getFullYear() === prevYear;
  });
  
  const previousMonthCategory = {};
  previousMonthExpenses.forEach(exp => {
    previousMonthCategory[exp.category] = (previousMonthCategory[exp.category] || 0) + parseFloat(exp.amount);
  });
  
  return {
    currentMonthTotal: currentMonthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0),
    previousMonthTotal: previousMonthExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0),
    previousMonthCategory: previousMonthCategory,
    currentMonthCount: currentMonthExpenses.length,
    previousMonthCount: previousMonthExpenses.length
  };
}

function analyzeCategoryPatterns(expenses) {
  const categoryTotals = {};
  const categoryCounts = {};
  
  Object.values(CATEGORIES).forEach(cat => {
    categoryTotals[cat] = 0;
    categoryCounts[cat] = 0;
  });
  
  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount);
    categoryTotals[expense.category] += amount;
    categoryCounts[expense.category] += 1;
  });
  
  const totalAmount = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  let topCategory = null;
  
  Object.entries(categoryTotals).forEach(([category, amount]) => {
    if (!topCategory || amount > topCategory.amount) {
      topCategory = { name: category, amount, count: categoryCounts[category] };
    }
  });
  
  return {
    totals: categoryTotals,
    counts: categoryCounts,
    topSpendingCategory: topCategory,
    categoryDistribution: Object.fromEntries(
      Object.entries(categoryTotals).map(([cat, amount]) => [cat, totalAmount > 0 ? (amount / totalAmount) * 100 : 0])
    )
  };
}

function detectBehavioralPatterns(expenses) {
  let weekendSpending = 0;
  let weekdaySpending = 0;
  let lateMonthSpending = 0;
  let earlyMonthSpending = 0;
  const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  
  if (expenses.length === 0) {
    return {
      weekendSpendingRatio: 0,
      lateMonthSpending: 0,
      earlyMonthSpending: 0,
      averageDailySpending: 0
    };
  }
  
  expenses.forEach(expense => {
    const date = new Date(expense.date);
    const day = date.getDay();
    const dayOfMonth = date.getDate();
    const amount = parseFloat(expense.amount);
    
    // Weekend vs weekday (0 = Sunday, 6 = Saturday)
    if (day === 0 || day === 6) {
      weekendSpending += amount;
    } else {
      weekdaySpending += amount;
    }
    
    // Late month (last 7 days) vs early month (first 7 days)
    if (dayOfMonth > 23) {
      lateMonthSpending += amount;
    } else if (dayOfMonth <= 7) {
      earlyMonthSpending += amount;
    }
  });
  
  const totalWeekSpending = weekendSpending + weekdaySpending;
  
  return {
    weekendSpendingRatio: totalWeekSpending > 0 ? weekendSpending / totalWeekSpending : 0,
    lateMonthSpending: totalSpent > 0 ? lateMonthSpending / totalSpent : 0,
    earlyMonthSpending: totalSpent > 0 ? earlyMonthSpending / totalSpent : 0,
    averageDailySpending: expenses.length > 0 ? totalSpent / expenses.length : 0
  };
}

function detectAnomalies(expenses) {
  if (expenses.length < 5) {
    return { unusualExpenses: [], averageAmount: 0, threshold: 0 };
  }
  
  const amounts = expenses.map(exp => parseFloat(exp.amount));
  const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - average, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const threshold = average + (2 * stdDev); // 2 standard deviations
  
  const unusualExpenses = expenses.filter(exp => parseFloat(exp.amount) > threshold);
  
  return {
    unusualExpenses: unusualExpenses.slice(0, 5), // Limit to top 5
    averageAmount: average,
    threshold: threshold,
    count: unusualExpenses.length
  };
}

function detectSavingsPotential(expenses, categoryAnalysis) {
  if (!categoryAnalysis.topSpendingCategory || expenses.length < 10) {
    return 0;
  }
  
  const topCategory = categoryAnalysis.topSpendingCategory;
  const categoryExpenses = expenses.filter(exp => exp.category === topCategory.name);
  
  if (categoryExpenses.length < 3) return 0;
  
  const amounts = categoryExpenses.map(exp => parseFloat(exp.amount)).sort((a, b) => a - b);
  const median = amounts[Math.floor(amounts.length / 2)];
  const average = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  
  // Potential savings if user reduced to median spending
  const potentialSavings = (average - median) * categoryExpenses.length * 0.3; // 30% of excess
  
  return Math.max(0, potentialSavings);
}

function generateAdaptiveRecommendations(expenses, budget, income) {
  const recommendations = [];
  const totalSpent = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const categoryAnalysis = analyzeCategoryPatterns(expenses);
  const today = new Date();
  const dayOfMonth = today.getDate();
  
  // Smart saving recommendation based on income
  if (income > 0 && totalSpent > 0) {
    const savingsRate = ((income - totalSpent) / income) * 100;
    if (savingsRate < 10 && savingsRate > -50) { // Allow some overspending
      const recommendation = savingsRate < 0 
        ? {
            type: 'warning',
            icon: '⚠️',
            title: 'Overspending Alert',
            message: `You're overspending by ${Math.abs(savingsRate).toFixed(1)}%. Consider adjusting your budget.`,
            priority: 1
          }
        : {
            type: 'suggestion',
            icon: '💰',
            title: 'Savings Boost',
            message: `You're saving ${savingsRate.toFixed(1)}% of income. Try to reach 15% for better financial security.`,
            priority: 3
          };
      recommendations.push(recommendation);
    }
  }
  
  // Mid-month check-in
  if (dayOfMonth === 15 && budget > 0) {
    const monthProgress = (totalSpent / budget) * 100;
    if (monthProgress > 60) {
      recommendations.push({
        type: 'warning',
        icon: '📅',
        title: 'Mid-Month Check',
        message: `You've used ${monthProgress.toFixed(1)}% of budget halfway through the month. Adjust spending pace.`,
        priority: 2
      });
    }
  }
  
  // Category-specific recommendations
  Object.entries(categoryAnalysis.totals).forEach(([category, amount]) => {
    if (budget > 0 && amount > budget * 0.3) { // If category exceeds 30% of budget
      recommendations.push({
        type: 'suggestion',
        icon: '🎯',
        title: `${category} Management`,
        message: `Consider optimizing ${category.toLowerCase()} expenses. Current: ₦${amount.toFixed(0)} (${((amount/budget)*100).toFixed(1)}% of budget)`,
        priority: 4
      });
    }
  });
  
  // Frequency-based recommendation
  const recentExpenses = expenses.slice(0, 10); // Last 10 expenses
  if (recentExpenses.length >= 5) {
    const daysBetween = [];
    for (let i = 1; i < recentExpenses.length; i++) {
      const date1 = new Date(recentExpenses[i-1].date);
      const date2 = new Date(recentExpenses[i].date);
      const diffTime = Math.abs(date2 - date1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysBetween.push(diffDays);
    }
    
    const avgDaysBetween = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length;
    if (avgDaysBetween < 2) {
      recommendations.push({
        type: 'suggestion',
        icon: '⏱️',
        title: 'Spacing Expenses',
        message: 'You\'re adding expenses very frequently. Consider batching similar expenses together.',
        priority: 4
      });
    }
  }
  
  return recommendations;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAlternativeCategories(primaryCategory, confidence) {
  const allCategories = Object.values(CATEGORIES);
  // Return all other categories, with MISC last if confidence is low
  let alternatives = allCategories.filter(cat => cat !== primaryCategory);
  
  if (confidence < 3) {
    // Move MISC to the end for low confidence
    alternatives = alternatives.filter(cat => cat !== CATEGORIES.MISC);
    alternatives.push(CATEGORIES.MISC);
  }
  
  return alternatives;
}

function getTimeBasedMealDescription() {
  const hour = new Date().getHours();
  if (hour < 11) return 'Breakfast';
  if (hour < 15) return 'Lunch';
  if (hour < 18) return 'Snack';
  return 'Dinner';
}

function getTransportType(amount) {
  if (amount < 300) return 'Short';
  if (amount < 1000) return 'Medium';
  if (amount < 3000) return 'Long';
  return 'Premium';
}

// ============================================
// AI LEARNING SYSTEM
// ============================================

export class AILearningSystem {
  constructor(userId) {
    this.userId = userId;
    this.learningData = null;
  }

  async loadLearningData() {
    try {
      const data = await AsyncStorage.getItem(`ai_learning_${this.userId}`);
      this.learningData = data ? JSON.parse(data) : this.getDefaultLearningData();
      return this.learningData;
    } catch (error) {
      console.error('Error loading AI learning data:', error);
      return this.getDefaultLearningData();
    }
  }

  async saveLearningData() {
    try {
      await AsyncStorage.setItem(`ai_learning_${this.userId}`, JSON.stringify(this.learningData));
    } catch (error) {
      console.error('Error saving AI learning data:', error);
    }
  }

  getDefaultLearningData() {
    return {
      categoryAccuracy: {},
      patternHistory: [],
      userCorrections: [],
      learningIterations: 0,
      confidenceThreshold: 2.0,
      userPreferences: {
        favoriteCategories: [],
        frequentlyUsedWords: {},
        spendingPatterns: {}
      }
    };
  }

  async learnFromUserCorrection(description, correctCategory, aiSuggestion) {
    await this.loadLearningData();
    
    // Store the correction
    this.learningData.userCorrections.push({
      description,
      correctCategory,
      aiSuggestion,
      timestamp: new Date().toISOString()
    });
    
    // Update category accuracy
    if (!this.learningData.categoryAccuracy[correctCategory]) {
      this.learningData.categoryAccuracy[correctCategory] = {
        correct: 0,
        total: 0,
        commonPatterns: [],
        commonAmounts: []
      };
    }
    
    const catData = this.learningData.categoryAccuracy[correctCategory];
    catData.correct++;
    catData.total++;
    
    // Extract patterns from description
    const words = description.toLowerCase().split(/[\s,.!?]+/).filter(word => word.length > 2);
    words.forEach(word => {
      if (!catData.commonPatterns.includes(word)) {
        catData.commonPatterns.push(word);
      }
      
      // Track frequently used words
      if (!this.learningData.userPreferences.frequentlyUsedWords[word]) {
        this.learningData.userPreferences.frequentlyUsedWords[word] = 0;
      }
      this.learningData.userPreferences.frequentlyUsedWords[word]++;
    });
    
    this.learningData.learningIterations++;
    
    // Adjust confidence threshold based on accuracy
    if (this.learningData.learningIterations > 10) {
      const totalAccuracy = Object.values(this.learningData.categoryAccuracy)
        .reduce((sum, cat) => sum + (cat.correct / cat.total), 0) / 
        Math.max(1, Object.keys(this.learningData.categoryAccuracy).length);
      
      // Dynamic threshold adjustment
      this.learningData.confidenceThreshold = Math.max(1.0, Math.min(3.0, 2.0 + (0.5 - totalAccuracy) * 2));
    }
    
    // Keep only recent corrections (last 100)
    if (this.learningData.userCorrections.length > 100) {
      this.learningData.userCorrections = this.learningData.userCorrections.slice(-100);
    }
    
    await this.saveLearningData();
    return this.learningData;
  }

  getLearnedPatternsForCategory(category) {
    if (!this.learningData?.categoryAccuracy?.[category]) {
      return [];
    }
    return this.learningData.categoryAccuracy[category].commonPatterns.slice(0, 10);
  }

  getCategoryConfidence(category) {
    if (!this.learningData?.categoryAccuracy?.[category]) {
      return 0.5;
    }
    const data = this.learningData.categoryAccuracy[category];
    return data.total > 0 ? data.correct / data.total : 0.5;
  }

  getUserPreferences() {
    return this.learningData?.userPreferences || this.getDefaultLearningData().userPreferences;
  }
}

// ============================================
// EXPORT HELPER FUNCTIONS
// ============================================

export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₦0.00';
  }
  return `₦${parseFloat(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function getCategoryColor(category) {
  return COLORS[category?.toUpperCase()] || COLORS.MISC;
}

// Cache for frequent calculations
let insightsCache = null;
let lastCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedInsights(expenses, budget, userData) {
  const now = Date.now();
  
  if (insightsCache && lastCacheTime && (now - lastCacheTime) < CACHE_DURATION) {
    return insightsCache;
  }
  
  insightsCache = await generateSmartInsights(expenses, budget, userData);
  lastCacheTime = now;
  
  return insightsCache;
}