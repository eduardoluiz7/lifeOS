# PROJECT CONTEXT: Life OS (Personal Organizer)

## 1. Project Overview
We are building a "Life OS", a unified personal organization application. The core philosophy is **Centralization**. Instead of separate silos for tasks, finances, and notes, all items exist on a single "Timeline/Feed" but behave differently based on their type.

## 2. Tech Stack
- **Frontend:** Next.js 14+ (App Router), React, TypeScript.
- **Styling:** Tailwind CSS, shadcn/ui (Radix Primitives), Lucide React Icons.
- **Backend/Database:** Supabase (PostgreSQL).
- **State/Data Fetching:** Server Components (RSC) for fetching, Server Actions for mutations.

## 3. Core Architectural Concept: "The Unified Entity"
We do NOT have separate tables for `tasks`, `transactions`, or `notes`.
We use a **Single Table Inheritance** strategy using a JSONB column.

- **Table Name:** `items`
- **Discriminator:** `type` column ('transaction' | 'task' | 'note' | 'goal')
- **Flexible Data:** `properties` column (JSONB) stores type-specific data.

## 4. Database Schema (Source of Truth)

```sql
-- Main Table
CREATE TABLE public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('transaction', 'task', 'note', 'goal')),
    title TEXT NOT NULL,
    description TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'paid'
    properties JSONB DEFAULT '{}'::jsonb, -- Stores type-specific logic
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Organization
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7)
);

CREATE TABLE public.item_tags (
    item_id UUID REFERENCES public.items(id),
    tag_id UUID REFERENCES public.tags(id),
    PRIMARY KEY (item_id, tag_id)
);
5. TypeScript Interfaces (Discriminated Unions)
When generating code, ALWAYS use this pattern to ensure type safety with the JSONB column.

TypeScript

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
6. UI/UX Rules & Patterns
The Timeline Component logic
The main view is a list of LifeItem[].

We map through this list.

Inside the map, we check item.type.

IF transaction: Render <TransactionCard /> (Shows Amount in Red/Green).

IF task: Render <TaskRow /> (Shows Checkbox).

IF note: Render <NoteSnippet />.

Component Library (shadcn/ui)
Use Card for containers.

Use Badge for tags and categories.

Use Dialog for the "Quick Add" modal.

Use Tabs inside the "Quick Add" modal to switch between creating a Task, Transaction, or Note.

7. Coding Rules for Copilot
Server Actions: Use Next.js Server Actions for all database INSERT/UPDATE/DELETE operations. Do not use API routes unless necessary.

Supabase Client: Use the typed Supabase client helper in @/lib/supabase.

Tailwind: Use utility classes. Do not create custom CSS files.

Dates: Use date-fns for date formatting.

Strict Types: Never use any. Use the LifeItem union type defined above.