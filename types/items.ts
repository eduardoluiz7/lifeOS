// Type Definitions
export type ItemType = 'transaction' | 'task' | 'note' | 'goal';

// 1. Specific Properties
export interface TransactionProperties {
  amount: number;
  currency: string;
  direction: 'income' | 'expense';
  category: string;
}

export interface TaskProperties {
  is_checked: boolean;
  priority: 'low' | 'medium' | 'high';
  estimated_minutes?: number;
}

export interface NoteProperties {
  body_content?: string;
}

export interface GoalProperties {
  target_amount?: number;
  deadline?: string;
  current_progress: number; // 0 to 100
}

// 2. Base Item
export interface BaseItem {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  occurred_at: string;
  created_at: string;
  status: string;
}

// 3. Extended Items (The Unions)
export interface TransactionItem extends BaseItem {
  type: 'transaction';
  properties: TransactionProperties;
}

export interface TaskItem extends BaseItem {
  type: 'task';
  properties: TaskProperties;
}

export interface NoteItem extends BaseItem {
  type: 'note';
  properties: NoteProperties;
}

export interface GoalItem extends BaseItem {
  type: 'goal';
  properties: GoalProperties;
}

// 4. The Unified Type
export type LifeItem = TransactionItem | TaskItem | NoteItem | GoalItem;
