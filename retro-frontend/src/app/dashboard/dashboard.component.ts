import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SocketService } from '../services/socket.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  boards: any[] = [];
  creating = false;
  teamName = '';
  password = '';
  limit = 10;
  date = new Date().toISOString().slice(0, 10);
  copied: Record<string, boolean> = {};
  // client-side per-browser created boards tracking
  createdLocal: string[] = [];
  quotaMessage: string | null = null;

  constructor(private api: SocketService, private router: Router, private cd: ChangeDetectorRef) {}

  async ngOnInit() {
    await this.api.ensureUser();
    // prefill team name and date from last usage or username
    const storedTeam = localStorage.getItem('retroTeamName');
    const storedUser = localStorage.getItem('retroUserName');
    const storedDate = localStorage.getItem('retroTeamDate');
    if (storedTeam) this.teamName = storedTeam;
    else if (storedUser) this.teamName = storedUser;
    if (storedDate) this.date = storedDate;
    this.loadLocalCreated();
    await this.load();
  }

  loadLocalCreated() {
    try {
      const raw = localStorage.getItem('retroCreatedBoards');
      const arr = raw ? JSON.parse(raw) : [];
      this.createdLocal = Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
    } catch (e) {
      this.createdLocal = [];
    }
  }

  updateLocalCreated() {
    try { localStorage.setItem('retroCreatedBoards', JSON.stringify(this.createdLocal)); } catch (e) { /* noop */ }
  }

  async load() {
    this.boards = await this.api.listBoards();
    // ensure view updates in zone-less or async contexts
    try { this.cd.detectChanges(); } catch (e) { /* noop */ }
  }

  toggleCreate() { this.creating = !this.creating; }

  saveDate() { localStorage.setItem('retroTeamDate', this.date); }

  getFinalName() {
    const base = (this.teamName || '').trim() || localStorage.getItem('retroUserName') || 'Team';
    return `${base} - ${this.date}`;
  }

  getBoardUrl(id: string) {
    const proto = location.protocol || 'http:';
    const host = location.hostname || 'localhost';
    const port = location.port ? `:${location.port}` : '';
    return `${proto}//${host}${port}/board/${id}`;
  }

  async copyUrl(boardId: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      this.copied[boardId] = true;
      setTimeout(() => { this.copied[boardId] = false; }, 1500);
    } catch (e) { console.warn('copy failed', e); }
  }

  async create() {
    const base = (this.teamName || '').trim() || localStorage.getItem('retroUserName') || 'Team';
    localStorage.setItem('retroTeamName', base);
    localStorage.setItem('retroTeamDate', this.date);
    const finalName = this.getFinalName();
    // Client-side quota: prevent more than `limit` created boards in this browser session
    if (this.createdLocal.length >= this.limit) {
      this.quotaMessage = `You have created ${this.limit} boards in this browser. Delete some or use another browser.`;
      return;
    }

    try {
      const r = await this.api.createBoard(finalName, this.password);
      await this.load();
      await this.api.joinBoard(r.boardId, this.password);
      // record locally so the UI reflects a per-browser quota
      this.createdLocal.push(r.boardId);
      this.updateLocalCreated();
      this.router.navigate(['/board', r.boardId]);
    } catch (err: any) {
      console.warn('Create/join failed', err?.message || err);
      // refresh board list in case user was recreated during the flow
      await this.load();
    }
  }

  async deleteBoard(id: string) {
    await this.api.deleteBoard(id);
    // remove from local created list if present (best-effort)
    const idx = this.createdLocal.indexOf(id);
    if (idx >= 0) { this.createdLocal.splice(idx, 1); this.updateLocalCreated(); }
    await this.load();
  }

  openBoard(id: string) { this.router.navigate(['/board', id]); }
}
