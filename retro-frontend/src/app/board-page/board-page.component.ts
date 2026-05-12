import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ChangeDetectorRef, NgZone, ApplicationRef } from '@angular/core';
import { SocketService } from '../services/socket.service';
import { BoardComponent } from '../board/board.component';
import * as AstraActions from '../store/astra.actions';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-board-page',
  standalone: true,
  imports: [CommonModule, FormsModule, BoardComponent],
  templateUrl: './board-page.component.html',
  styleUrl: './board-page.component.scss'
})
export class BoardPageComponent implements OnInit {
  boardId!: string;
  password = '';
  locked = true;
  probeChecked = false;
  isSubmitting = false;
  private store = inject(Store);
  
  error: string | null = null;
  constructor(private route: ActivatedRoute, private socket: SocketService, private cdr: ChangeDetectorRef, private ngZone: NgZone, private appRef: ApplicationRef) {}

  ngOnInit() {
    this.boardId = this.route.snapshot.paramMap.get('id')!;
    (async () => {
      try {
        const rawMeta = await this.socket.probeBoard(this.boardId, '');
        
        // Map the properties to fit the BoardMeta interface
        const meta = { 
          id: rawMeta.boardId, 
          teamName: rawMeta.teamName, 
          createdAt: rawMeta.createdAt,
          ownerId: rawMeta.ownerId
        };

        // DISPATCH THE NETWORK SUCCESS ACTION HERE
        this.store.dispatch(AstraActions.boardJoinedSuccess({ meta }));

        // unlock and mark probe complete inside Angular zone
        this.ngZone.run(() => {
          this.locked = false;
          this.error = null;
          this.probeChecked = true;
        });
        try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
        try { this.appRef.tick(); } catch (e) { /* ignore */ }
        // establish socket connection in background
        this.socket.joinBoard(this.boardId, '').catch(() => {});
      } catch (err: any) {
        const msg = (err && err.message) ? err.message : '';
        if (msg && msg.toLowerCase().includes('not found')) {
          this.ngZone.run(() => { this.error = 'Board not found'; this.probeChecked = true; });
          try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
          try { this.appRef.tick(); } catch (e) { /* ignore */ }
        } else {
          this.ngZone.run(() => { this.locked = true; this.error = null; this.probeChecked = true; });
          try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
          try { this.appRef.tick(); } catch (e) { /* ignore */ }
        }
      }
    })();
  }

  async submit() {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    try {
      const meta = await this.socket.joinBoard(this.boardId, this.password);
      this.store.dispatch(AstraActions.boardJoinedSuccess({ meta }));
      this.locked = false;
      this.error = null;
    } catch (err: any) {
      this.error = err.message || 'Invalid password';
      this.isSubmitting = false;
    }
    this.cdr.markForCheck();
  }
}
