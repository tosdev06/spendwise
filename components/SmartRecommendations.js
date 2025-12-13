// components/SmartRecommendations.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SmartRecommendations({ insights, onActionPress }) {
  if (!insights || insights.length === 0) return null;

  const getTypeStyles = (type) => {
    switch (type) {
      case 'warning':
        return {
          backgroundColor: '#FEF2F2',
          borderColor: '#FCA5A5',
          iconColor: '#EF4444',
          icon: 'warning',
        };
      case 'suggestion':
        return {
          backgroundColor: '#FFFBEB',
          borderColor: '#FCD34D',
          iconColor: '#F59E0B',
          icon: 'bulb',
        };
      case 'positive':
        return {
          backgroundColor: '#F0FDF4',
          borderColor: '#86EFAC',
          iconColor: '#10B981',
          icon: 'checkmark-circle',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#EFF6FF',
          borderColor: '#93C5FD',
          iconColor: '#3B82F6',
          icon: 'information-circle',
        };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={24} color="#6366F1" />
        <Text style={styles.title}>AI Insights</Text>
      </View>
      
      {insights.map((insight, index) => {
        const typeStyles = getTypeStyles(insight.type);
        
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.card,
              { 
                backgroundColor: typeStyles.backgroundColor,
                borderLeftWidth: 4,
                borderLeftColor: typeStyles.borderColor,
              }
            ]}
            onPress={() => onActionPress?.(insight)}
            activeOpacity={0.7}
            disabled={false}  // FIX: Explicit boolean
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name={insight.icon || typeStyles.icon} size={20} color={typeStyles.iconColor} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{insight.title}</Text>
                <Text style={styles.cardMessage}>{insight.message}</Text>
              </View>
            </View>
            
            {insight.data && (
              <View style={styles.dataContainer}>
                {insight.data.budgetUsage && (
                  <View style={styles.dataItem}>
                    <Text style={styles.dataLabel}>Budget Usage:</Text>
                    <Text style={[styles.dataValue, { color: typeStyles.iconColor }]}>
                      {Number(insight.data.budgetUsage).toFixed(1)}%  {/* FIX: Convert to number */}
                    </Text>
                  </View>
                )}
                {insight.data.dailyAllowance && (
                  <View style={styles.dataItem}>
                    <Text style={styles.dataLabel}>Daily Allowance:</Text>
                    <Text style={[styles.dataValue, { color: typeStyles.iconColor }]}>
                      ₦{Number(insight.data.dailyAllowance).toFixed(0)}  {/* FIX: Convert to number */}
                    </Text>
                  </View>
                )}
                {insight.data.prediction && (
                  <View style={styles.dataItem}>
                    <Text style={styles.dataLabel}>Prediction:</Text>
                    <Text style={[styles.dataValue, { color: typeStyles.iconColor }]}>
                      ₦{Number(insight.data.prediction).toFixed(0)}  {/* FIX: Convert to number */}
                    </Text>
                  </View>
                )}
              </View>
            )}
            
            {insight.action && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => onActionPress?.(insight)}
                disabled={false}  // FIX: Explicit boolean
              >
                <Text style={[styles.actionText, { color: typeStyles.iconColor }]}>
                  {insight.action}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={typeStyles.iconColor} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginLeft: 8,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardMessage: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  dataContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dataLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  dataValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionText: {
    fontWeight: '600',
    marginRight: 8,
  },
});