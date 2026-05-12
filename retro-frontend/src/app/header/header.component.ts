import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { SocketService } from '../services/socket.service';
import { selectActiveBoardMeta } from '../store/astra.selectors';
import { BoardMeta } from '../services/socket.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  teamName = 'Retros';
  createdAt: number | null = null;
  boardId: string | null = null;
  isAboutOpen = false;
  
  private sub?: Subscription;
  private store = inject(Store);

  constructor(private socket: SocketService, private router: Router) {}

  ngOnInit() {
    this.sub = this.store.select(selectActiveBoardMeta).subscribe((b: BoardMeta | null) => {
      if (b) { 
        this.teamName = b.teamName; 
        this.createdAt = b.createdAt; 
        this.boardId = b.id; 
      } else { 
        this.teamName = 'Retros'; 
        this.createdAt = null; 
        this.boardId = null; 
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  goDashboard() { this.router.navigate(['/dashboard']); }

  exportPdf() {
    if (!this.boardId) return;
    this.socket.downloadPdf(this.boardId).catch(err => console.error(err));
  }

  get boardStamp(): string {
    const when = this.createdAt ? this.createdAt : Date.now();
    const datePart = new Date(when).toISOString().slice(0, 10);
    return `${this.teamName.toUpperCase()} | ${datePart}`;
  }

  openAbout() {
    this.isAboutOpen = true;
  }

  closeAbout() {
    this.isAboutOpen = false;
  }
}