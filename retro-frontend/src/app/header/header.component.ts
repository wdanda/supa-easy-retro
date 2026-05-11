import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';

import { SocketService } from '../services/socket.service';
import { selectActiveBoardMeta } from '../store/astra.selectors';

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
  isDark = false;
  
  private sub?: Subscription;
  private store = inject(Store);

  constructor(private socket: SocketService, private router: Router) {}

  ngOnInit() {
    this.sub = this.store.select(selectActiveBoardMeta).subscribe(b => {
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

    const stored = localStorage.getItem('retroDarkMode');
    this.isDark = stored === '1';
    if (this.isDark) document.documentElement.classList.add('dark-theme');
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  goDashboard() { this.router.navigate(['/dashboard']); }

  exportPdf() {
    if (!this.boardId) return;
    this.socket.downloadPdf(this.boardId).catch(err => console.error(err));
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    localStorage.setItem('retroDarkMode', this.isDark ? '1' : '0');
    document.documentElement.classList.toggle('dark-theme', this.isDark);
  }
}