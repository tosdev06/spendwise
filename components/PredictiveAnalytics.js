// components/PredictiveAnalytics.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { predictNextWeekSpending, formatCurrency } from '../lib/supabase';

export default function PredictiveAnalytics({ expenses, budget, monthlyTotal }) {
  const [predictions, setPredictions] = useState(null);

  useEffect(() => {
    if (expenses && expenses.length > 5) {
      const nextWeek = predictNextWeekSpending(expenses);
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const daysLeft = daysInMonth - today.getDate();
      
      // Calculate projected monthly total
      const dailyAverage = monthlyTotal / today.getDate();
      const projectedTotal = dailyAverage * daysInMonth;
      const projectedRemaining = projectedTotal - monthlyTotal;
      
      setPredictions({
        nextWeek,
        projectedTotal,
        projectedRemaining,
        dailyAverage,
        daysLeft
      });
    }
  }, [expenses, monthlyTotal]);

  if (!predictions || expenses.length < 5) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="trending-up" size={24} color="#8B5CF6" />
          <Text style={styles.title}>Predictive Analytics</Text>
        </View>
        <Text style={styles.placeholderText}>
          Add more expenses to unlock predictive insights
        </Text>
      </View>
    );
  }

  const getProjectionStatus = () => {
    if (!budget) return 'neutral';
    const percentage = (predictions.projectedTotal / budget) * 100;
    if (percentage > 110) return 'over';
    if (percentage > 90) return 'warning';
    if (percentage > 70) return 'good';
    return 'excellent';
  };

  const status = getProjectionStatus();
  const statusColors = {
    over: '#EF4444',
    warning: '#F59E0B',
    good: '#10B981',
    excellent: '#059669',
    neutral: '#6B7280'
  };
  
  const statusMessages = {
    over: 'High Risk',
    warning: 'Caution',
    good: 'Good',
    excellent: 'Excellent',
    neutral: 'Needs Data'
  };

  // Helper function to get background color with transparency
  const getStatusBackgroundColor = (status) => {
    switch (status) {
      case 'over': return '#FEF2F2';
      case 'warning': return '#FFFBEB';
      case 'good': return '#F0FDF4';
      case 'excellent': return '#ECFDF5';
      case 'neutral': return '#F8FAFC';
      default: return '#F8FAFC';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="trending-up" size={24} color="#8B5CF6" />
        <Text style={styles.title}>Predictive Analytics</Text>
      </View>
      
      <View style={styles.grid}>
        {/* Next Week Prediction */}
        <View style={styles.predictionCard}>
          <View style={[styles.predictionIcon, { backgroundColor: '#F5F3FF' }]}>
            <Ionicons name="calendar" size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.predictionValue}>
            {predictions.nextWeek ? formatCurrency(predictions.nextWeek) : '--'}
          </Text>
          <Text style={styles.predictionLabel}>Next Week</Text>
        </View>
        
        {/* Projected Monthly */}
        <View style={styles.predictionCard}>
          <View style={[styles.predictionIcon, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="stats-chart" size={20} color="#10B981" />
          </View>
          <Text style={styles.predictionValue}>
            {formatCurrency(predictions.projectedTotal)}
          </Text>
          <Text style={styles.predictionLabel}>Projected Month</Text>
        </View>
      </View>
      
      {/* Status Indicator */}
      <View style={[styles.statusCard, { backgroundColor: getStatusBackgroundColor(status) }]}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
          <Text style={[styles.statusTitle, { color: statusColors[status] }]}>
            {statusMessages[status]}
          </Text>
        </View>
        
        {budget > 0 && (
          <>
            <Text style={styles.statusMessage}>
              Projected to use {((predictions.projectedTotal / budget) * 100).toFixed(1)}% of your budget
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: Math.min(100, (predictions.projectedTotal / budget) * 100) + '%',
                    backgroundColor: statusColors[status]
                  }
                ]} 
              />
            </View>
          </>
        )}
        
        {!budget && (
          <Text style={styles.statusMessage}>
            Set a monthly budget for better predictions
          </Text>
        )}
      </View>
      
      {/* Daily Insights */}
      <View style={styles.dailyInsights}>
        <View style={styles.insightItem}>
          <Ionicons name="speedometer" size={16} color="#6366F1" />
          <Text style={styles.insightText}>
            Daily Average: {formatCurrency(predictions.dailyAverage)}
          </Text>
        </View>
        <View style={styles.insightItem}>
          <Ionicons name="time" size={16} color="#6366F1" />
          <Text style={styles.insightText}>
            {predictions.daysLeft} days remaining this month
          </Text>
        </View>
        {predictions.projectedRemaining > 0 && (
          <View style={styles.insightItem}>
            <Ionicons name="cash" size={16} color="#6366F1" />
            <Text style={styles.insightText}>
              Projected remaining: {formatCurrency(predictions.projectedRemaining)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginLeft: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  predictionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  predictionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  predictionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
  },
  predictionLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusMessage: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  dailyInsights: {
    gap: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightText: {
    fontSize: 13,
    color: '#475569',
  },
});