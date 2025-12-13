import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async checkAndSync() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    
    try {
      // Check network connectivity (simplified)
      const isOnline = navigator.onLine;
      if (!isOnline) return;

      // Sync offline expenses
      await this.syncOfflineExpenses();
      
      // Sync offline operations
      await this.syncQueueOperations();
      
      this.retryCount = 0; // Reset retry count on success
      
    } catch (error) {
      console.error('Sync error:', error);
      this.retryCount++;
      
      if (this.retryCount < this.maxRetries) {
        // Retry after delay
        setTimeout(() => this.checkAndSync(), 5000);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async syncOfflineExpenses() {
    try {
      const offlineExpensesJSON = await AsyncStorage.getItem('offline_expenses');
      if (!offlineExpensesJSON) return;

      const offlineExpenses = JSON.parse(offlineExpensesJSON);
      const unsyncedExpenses = offlineExpenses.filter(exp => !exp.is_synced);
      
      if (unsyncedExpenses.length === 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let syncedCount = 0;
      const remainingExpenses = [];

      for (const expense of unsyncedExpenses) {
        try {
          const { error } = await supabase
            .from('expenses')
            .insert([{
              user_id: user.id,
              amount: expense.amount,
              category: expense.category,
              description: expense.description,
              date: expense.date,
              is_synced: true,
            }]);

          if (error) {
            // Keep in local storage for retry
            remainingExpenses.push(expense);
            throw error;
          }

          // Mark as synced
          expense.is_synced = true;
          syncedCount++;
          
          // Add to sync queue for record keeping
          await this.addToSyncQueue('expenses', 'INSERT', expense);
          
        } catch (error) {
          console.error('Failed to sync expense:', error);
          remainingExpenses.push(expense);
        }
      }

      // Update local storage
      const syncedExpenses = offlineExpenses.filter(exp => exp.is_synced);
      const allExpenses = [...syncedExpenses, ...remainingExpenses];
      
      await AsyncStorage.setItem('offline_expenses', JSON.stringify(allExpenses));

      if (syncedCount > 0) {
        console.log(`Synced ${syncedCount} expenses`);
      }

    } catch (error) {
      console.error('Sync expenses error:', error);
      throw error;
    }
  }

  async syncQueueOperations() {
    try {
      const syncQueueJSON = await AsyncStorage.getItem('sync_queue');
      if (!syncQueueJSON) return;

      const syncQueue = JSON.parse(syncQueueJSON);
      const pendingOperations = syncQueue.filter(op => !op.is_synced);
      
      if (pendingOperations.length === 0) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const remainingOperations = [];
      let syncedCount = 0;

      for (const operation of pendingOperations) {
        try {
          // Execute the operation based on type
          switch (operation.operation) {
            case 'INSERT':
              await supabase
                .from(operation.table_name)
                .insert([{ ...operation.data, user_id: user.id }]);
              break;
            case 'UPDATE':
              await supabase
                .from(operation.table_name)
                .update(operation.data)
                .eq('id', operation.data.id);
              break;
            case 'DELETE':
              await supabase
                .from(operation.table_name)
                .delete()
                .eq('id', operation.data.id);
              break;
          }

          operation.is_synced = true;
          syncedCount++;
          
        } catch (error) {
          console.error('Sync operation failed:', error);
          remainingOperations.push(operation);
        }
      }

      // Update sync queue
      const syncedOperations = syncQueue.filter(op => op.is_synced);
      const allOperations = [...syncedOperations, ...remainingOperations];
      
      await AsyncStorage.setItem('sync_queue', JSON.stringify(allOperations));

      if (syncedCount > 0) {
        console.log(`Synced ${syncedCount} operations`);
      }

    } catch (error) {
      console.error('Sync queue error:', error);
      throw error;
    }
  }

  async addToSyncQueue(tableName, operation, data) {
    try {
      const syncQueueJSON = await AsyncStorage.getItem('sync_queue');
      const syncQueue = syncQueueJSON ? JSON.parse(syncQueueJSON) : [];
      
      syncQueue.push({
        table_name: tableName,
        operation: operation,
        data: data,
        is_synced: false,
        created_at: new Date().toISOString(),
      });

      await AsyncStorage.setItem('sync_queue', JSON.stringify(syncQueue));
    } catch (error) {
      console.error('Error adding to sync queue:', error);
    }
  }

  async getSyncStatus() {
    try {
      const offlineExpensesJSON = await AsyncStorage.getItem('offline_expenses');
      const offlineExpenses = offlineExpensesJSON ? JSON.parse(offlineExpensesJSON) : [];
      const unsyncedExpenses = offlineExpenses.filter(exp => !exp.is_synced);

      const syncQueueJSON = await AsyncStorage.getItem('sync_queue');
      const syncQueue = syncQueueJSON ? JSON.parse(syncQueueJSON) : [];
      const unsyncedOperations = syncQueue.filter(op => !op.is_synced);

      return {
        offlineExpenses: unsyncedExpenses.length,
        pendingOperations: unsyncedOperations.length,
        totalPending: unsyncedExpenses.length + unsyncedOperations.length,
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { offlineExpenses: 0, pendingOperations: 0, totalPending: 0 };
    }
  }

  async clearAllData() {
    try {
      await AsyncStorage.removeItem('offline_expenses');
      await AsyncStorage.removeItem('sync_queue');
      console.log('All local data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

export default new SyncService();