import { CATEGORIES } from '../lib/supabase';

export function generateSpendingInsights(expenses, budget, month) {
  const insights = [];
  
  if (!expenses || expenses.length === 0) {
    insights.push({
      type: 'info',
      icon: '📊',
      title: 'No expenses yet',
      message: 'Start tracking your expenses to get personalized insights.',
      priority: 1,
    });
    return insights;
  }

  // Calculate totals by category
  const categoryTotals = {};
  Object.values(CATEGORIES).forEach(cat => {
    categoryTotals[cat] = 0;
  });

  let totalSpent = 0;
  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount);
    categoryTotals[expense.category] += amount;
    totalSpent += amount;
  });

  // Budget insights
  if (budget > 0) {
    const budgetPercentage = (totalSpent / budget) * 100;
    
    if (budgetPercentage > 100) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Over Budget',
        message: `You've exceeded your monthly budget by ${formatCurrency(totalSpent - budget)}.`,
        priority: 1,
      });
    } else if (budgetPercentage > 80) {
      insights.push({
        type: 'warning',
        icon: '📈',
        title: 'Approaching Limit',
        message: `You've used ${budgetPercentage.toFixed(1)}% of your budget.`,
        priority: 2,
      });
    } else if (budgetPercentage < 30) {
      insights.push({
        type: 'positive',
        icon: '🎉',
        title: 'Great Control',
        message: `You're only using ${budgetPercentage.toFixed(1)}% of your budget. Keep it up!`,
        priority: 3,
      });
    }

    // Daily average insight
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const dailyAverage = totalSpent / daysInMonth;
    const dailyBudget = budget / daysInMonth;

    if (dailyAverage > dailyBudget) {
      insights.push({
        type: 'suggestion',
        icon: '💡',
        title: 'High Daily Spending',
        message: `Your daily average (${formatCurrency(dailyAverage)}) exceeds your daily budget (${formatCurrency(dailyBudget)}).`,
        priority: 2,
      });
    }
  }

  // Category insights
  let maxCategory = '';
  let maxAmount = 0;
  Object.entries(categoryTotals).forEach(([category, amount]) => {
    if (amount > maxAmount) {
      maxAmount = amount;
      maxCategory = category;
    }
  });

  if (maxCategory) {
    const percentage = (maxAmount / totalSpent) * 100;
    
    if (percentage > 50) {
      insights.push({
        type: 'warning',
        icon: '🎯',
        title: 'Category Focus',
        message: `${percentage.toFixed(1)}% of your spending is on ${maxCategory}. Consider diversifying.`,
        priority: 2,
      });
    }
  }

  // Compare with previous month (simplified)
  const currentDate = new Date();
  const isNearMonthEnd = currentDate.getDate() > 25;
  
  if (isNearMonthEnd && budget > 0) {
    const remainingDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() - currentDate.getDate();
    const remainingBudget = budget - totalSpent;
    const dailyAllowance = remainingBudget / Math.max(1, remainingDays);

    insights.push({
      type: 'suggestion',
      icon: '📅',
      title: 'End of Month Plan',
      message: `With ${remainingDays} days left, you can spend ${formatCurrency(dailyAllowance)} per day to stay on budget.`,
      priority: 3,
    });
  }

  // Spending pattern insights
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  
  const recentExpenses = expenses.filter(exp => new Date(exp.date) >= weekAgo);
  const recentTotal = recentExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const weeklyAverage = recentTotal / 7;

  if (weeklyAverage > (totalSpent / 30) * 1.5) {
    insights.push({
      type: 'warning',
      icon: '🚀',
      title: 'Increased Spending',
      message: 'Your spending has increased recently. Check if this is a new trend.',
      priority: 2,
    });
  }

  // Sort insights by priority
  insights.sort((a, b) => a.priority - b.priority);

  return insights;
}

export function generateCategorySuggestions(description) {
  const lowerDesc = description.toLowerCase();
  const suggestions = [];
  
  if (lowerDesc.includes('burger') || lowerDesc.includes('pizza') || 
      lowerDesc.includes('restaurant') || lowerDesc.includes('food')) {
    suggestions.push(CATEGORIES.FOOD);
  }
  
  if (lowerDesc.includes('uber') || lowerDesc.includes('taxi') || 
      lowerDesc.includes('bus') || lowerDesc.includes('train')) {
    suggestions.push(CATEGORIES.TRANSPORT);
  }
  
  if (lowerDesc.includes('textbook') || lowerDesc.includes('book') || 
      lowerDesc.includes('tuition') || lowerDesc.includes('course')) {
    suggestions.push(CATEGORIES.ACADEMICS);
  }
  
  if (lowerDesc.includes('movie') || lowerDesc.includes('netflix') || 
      lowerDesc.includes('concert') || lowerDesc.includes('game')) {
    suggestions.push(CATEGORIES.ENTERTAINMENT);
  }
  
  // If no specific category found, return all for user to choose
  if (suggestions.length === 0) {
    return Object.values(CATEGORIES);
  }
  
  return suggestions;
}

export function formatCurrency(amount) {
  return `${parseFloat(amount).toFixed(2)} naira`;
}

export function getBudgetRecommendation(income, expenses) {
  const recommendations = {
    [CATEGORIES.FOOD]: '15-20%',
    [CATEGORIES.TRANSPORT]: '10-15%',
    [CATEGORIES.ACADEMICS]: '5-10%',
    [CATEGORIES.ENTERTAINMENT]: '5-10%',
    [CATEGORIES.MISC]: '5-10%',
    savings: '10-20%',
    essentials: '50-60%',
  };
  
  return recommendations;
}