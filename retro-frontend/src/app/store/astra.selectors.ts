import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AstraState } from './astra.reducer';

// 1. Select the entire feature slice from the global store
export const selectAstraState = createFeatureSelector<AstraState>('astra');

// 2. Simple Selectors (Grabbing slices of state)
export const selectAllColumns = createSelector(
  selectAstraState,
  (state) => state.columns
);

export const selectSearchTerm = createSelector(
  selectAstraState,
  (state) => state.searchTerm
);

export const selectActiveBoardMeta = createSelector(
  selectAstraState,
  (state) => state.activeBoardMeta
);

// 3. Complex/Derived Selectors (Replacing combineLatest)
// This automatically re-runs ONLY when either columns or searchTerm changes.
export const selectFilteredColumns = createSelector(
  selectAllColumns,
  selectSearchTerm,
  (columns, searchTerm) => {
    if (!searchTerm.trim()) {
      return columns;
    }

    const lowerTerm = searchTerm.toLowerCase();
    
    return columns.map(column => ({
      ...column,
      cards: column.cards.filter(card => card.text.toLowerCase().includes(lowerTerm))
    }));
  }
);