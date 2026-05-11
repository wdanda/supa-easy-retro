import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';
import * as AstraActions from './astra.actions';
import { SocketService } from '../services/socket.service';

@Injectable()
export class AstraEffects {

  private actions$ = inject(Actions);
  private socketService = inject(SocketService);

  // 1. Fire-and-Forget Effect for Optimistic Updates
  // When 'addCardOptimistic' is dispatched, we intercept it here to trigger the network call.
  // We use { dispatch: false } because this effect doesn't return a NEW action.
  addCardToNetwork$ = createEffect(() => 
    this.actions$.pipe(
      ofType(AstraActions.addCardOptimistic),
      tap((action) => {
        console.log(`🟡 [EFFECT] Intercepted optimistic add. Sending to server...`);
        // The service now JUST emits the socket event, nothing else.
        this.socketService.addCard(action.boardId, action.columnKey, action.card.text);
      })
    ),
    { dispatch: false }
  );

  deleteCardToNetwork$ = createEffect(() => 
    this.actions$.pipe(
      ofType(AstraActions.deleteCardOptimistic),
      tap((action) => this.socketService.deleteCard(action.boardId, action.columnKey, action.cardId))
    ),
    { dispatch: false }
  );

  upvoteCardToNetwork$ = createEffect(() => 
    this.actions$.pipe(
      ofType(AstraActions.upvoteCardOptimistic),
      tap((action) => this.socketService.upvoteCard(action.boardId, action.columnKey, action.cardId))
    ),
    { dispatch: false }
  );

  reorderCardsToNetwork$ = createEffect(() => 
    this.actions$.pipe(
      ofType(AstraActions.reorderCardsOptimistic),
      tap((action) => this.socketService.reorderCards(
        action.boardId, 
        action.columnKey, 
        action.previousIndex, 
        action.currentIndex
      ))
    ),
    { dispatch: false }
  );
}