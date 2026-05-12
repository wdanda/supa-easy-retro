
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CardComponent } from '../card/card.component';
import { Card, Column, SocketService } from '../services/socket.service';

// 1. Import Selector and Actions
import { Store } from '@ngrx/store';
import * as AstraActions from '../store/astra.actions';
import { selectActiveBoardMeta } from '../store/astra.selectors';

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [CommonModule, CardComponent, FormsModule, DragDropModule],
  templateUrl: './column.component.html',
  styleUrls: ['./column.component.scss']
})
export class ColumnComponent implements OnInit, OnDestroy {
  @Input() column!: Column;
  newCardText = '';
  boardId: string | null = null;
  private sub?: Subscription;
  currentUserId?: string;

  private store = inject(Store);
  private socketService = inject(SocketService);

  ngOnInit() {
    this.currentUserId = this.socketService.getCurrentUserId();
    this.sub = this.store.select(selectActiveBoardMeta).subscribe(meta => {
      this.boardId = meta ? meta.id : null;
    });
  }

  canDelete(card: Card): boolean {
    this.currentUserId = this.currentUserId || this.socketService.getCurrentUserId();
    return !!this.currentUserId && !!card.authorId && card.authorId === this.currentUserId;
  }

  canUpvote(card: Card): boolean {
    this.currentUserId = this.currentUserId || this.socketService.getCurrentUserId();
    if (!this.currentUserId) return false;
    return !(card.upvotedBy || []).includes(this.currentUserId);
  }
  
  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  addCard() {
    if (!this.newCardText.trim() || !this.boardId) return;
    const tempCard: Card = {
      id: crypto.randomUUID(),
      text: this.newCardText,
      upvotes: 0
    };
    this.store.dispatch(AstraActions.addCardOptimistic({ 
      boardId: this.boardId, 
      columnKey: this.column.key, 
      card: tempCard 
    }));
    
    this.newCardText = '';
  }

  deleteCard(card: Card) {
    if (!this.boardId) return;
    if (!this.canDelete(card)) return;
    this.store.dispatch(AstraActions.deleteCardOptimistic({ 
      boardId: this.boardId, 
      columnKey: this.column.key, 
      cardId: card.id
    }));
  }

  upvoteCard(card: Card) {
    if (!this.boardId) return;
    this.currentUserId = this.currentUserId || this.socketService.getCurrentUserId();
    if (!this.currentUserId) return;
    if (!this.canUpvote(card)) return;
    this.store.dispatch(AstraActions.upvoteCardOptimistic({ 
      boardId: this.boardId, 
      columnKey: this.column.key, 
      cardId: card.id,
      userId: this.currentUserId
    }));
  }

  drop(event: CdkDragDrop<Card[]>) {
    if (event.previousIndex !== event.currentIndex && this.boardId) {
      this.store.dispatch(AstraActions.reorderCardsOptimistic({
        boardId: this.boardId,
        columnKey: this.column.key,
        previousIndex: event.previousIndex,
        currentIndex: event.currentIndex
      }));
    }
  }

}
