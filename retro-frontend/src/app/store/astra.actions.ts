import { createAction, props } from '@ngrx/store';
import { Column, BoardMeta, Card } from '../services/socket.service';

// --- UI Actions (Triggered by Components) ---
export const addCardOptimistic = createAction(
  '[Board UI] Add Card Optimistic',
  props<{ boardId: string; columnKey: string; card: Card }>()
);

export const updateSearchTerm = createAction(
  '[Board UI] Update Search Term',
  props<{ term: string }>()
);

// --- Network Actions (Triggered by Sockets/HTTP) ---
export const boardJoinedSuccess = createAction(
  '[Board Network] Joined Successfully',
  props<{ meta: BoardMeta }>()
);

export const boardStateReceived = createAction(
  '[Board Network] State Received',
  props<{ columns: Column[] }>()
);

export const deleteCardOptimistic = createAction(
  '[Board UI] Delete Card Optimistic',
  props<{ boardId: string; columnKey: string; cardId: string }>()
);

export const upvoteCardOptimistic = createAction(
  '[Board UI] Upvote Card Optimistic',
  props<{ boardId: string; columnKey: string; cardId: string; userId: string }>()
);

export const reorderCardsOptimistic = createAction(
  '[Board UI] Reorder Cards Optimistic',
  props<{ boardId: string; columnKey: string; previousIndex: number; currentIndex: number }>()
);

