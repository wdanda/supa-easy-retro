import { createReducer, on } from '@ngrx/store';
import * as AstraActions from './astra.actions';
import { Column, BoardMeta } from '../services/socket.service';

export interface AstraState {
  columns: Column[];
  activeBoardMeta: BoardMeta | null;
  searchTerm: string;
}

export const initialState: AstraState = {
  columns: [
    { key: 'wentWell', name: 'Went well', cards: [] },
    { key: 'toImprove', name: 'To improve', cards: [] },
    { key: 'actionItems', name: 'Action items', cards: [] }
  ],
  activeBoardMeta: null,
  searchTerm: ''
};

export const astraReducer = createReducer(
  initialState,

  // 1. Handle incoming server state (Overwrites local columns)
  on(AstraActions.boardStateReceived, (state, { columns }) => ({
    ...state,
    columns
  })),

  // 2. Handle metadata updates
  on(AstraActions.boardJoinedSuccess, (state, { meta }) => ({
    ...state,
    activeBoardMeta: meta
  })),

  // 3. Handle search term updates
  on(AstraActions.updateSearchTerm, (state, { term }) => ({
    ...state,
    searchTerm: term
  })),

  // 4. Handle Optimistic Updates
  on(AstraActions.addCardOptimistic, (state, { columnKey, card }) => ({
    ...state,
    columns: state.columns.map(column => 
      column.key === columnKey 
        ? { ...column, cards: [...column.cards, card] } 
        : column
    )
  })),

  on(AstraActions.deleteCardOptimistic, (state, { columnKey, cardId }) => ({
    ...state,
    columns: state.columns.map(column => 
      column.key === columnKey 
        ? { ...column, cards: column.cards.filter(c => c.id !== cardId) }
        : column
    )
  })),

  on(AstraActions.upvoteCardOptimistic, (state, { columnKey, cardId, userId }) => ({
    ...state,
    columns: state.columns.map(column => 
      column.key === columnKey 
        ? { 
            ...column, 
            cards: column.cards.map(c => 
              c.id === cardId
                ? ((c.upvotedBy || []).includes(userId)
                  ? c
                  : { ...c, upvotes: c.upvotes + 1, upvotedBy: [...(c.upvotedBy || []), userId] })
                : c
            ) 
          }
        : column
    )
  })),

  on(AstraActions.reorderCardsOptimistic, (state, { columnKey, previousIndex, currentIndex }) => ({
    ...state,
    columns: state.columns.map(column => {
      if (column.key === columnKey) {
        const cards = [...column.cards];
        const [movedCard] = cards.splice(previousIndex, 1);
        cards.splice(currentIndex, 0, movedCard);
        return { ...column, cards };
      }
      return column;
    })
  }))
);