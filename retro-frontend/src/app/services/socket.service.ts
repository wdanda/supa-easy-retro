import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Store } from '@ngrx/store';
import * as AstraActions from '../store/astra.actions';

export interface Card { id: string; text: string; upvotes: number; authorId?: string; upvotedBy?: string[]; }
export interface Column { key: string; name: string; cards: Card[]; }
export interface BoardMeta { id: string; teamName: string; createdAt: number; ownerId?: string; }

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket?: Socket;
  private userId?: string;
  private readonly API_BASE: string;
  
  private store = inject(Store);

  constructor() {
    const host = location.hostname;
    // In local dev the frontend runs on a different port (4201) than the backend (4000).
    // In production (Render) everything is served from the same Express server, so use the origin as-is.
    this.API_BASE = (host === 'localhost' || host === '127.0.0.1')
      ? `http://${host}:4000`
      : location.origin;
    const stored = localStorage.getItem('retroUserId');
    if (stored) this.userId = stored;
  }

  async ensureUser(): Promise<string> {
    if (this.userId) {
      try {
        const check = await fetch(`${this.API_BASE}/api/boards?userId=${this.userId}`);
        if (check.status !== 401) return this.userId;
      } catch (e) {}
    }

    const username = localStorage.getItem('retroUserName') || `User-${Math.random().toString(36).slice(2,7)}`;
    const res = await fetch(`${this.API_BASE}/api/user`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username })
    });
    const body = await res.json();
    this.userId = body.userId;
    localStorage.setItem('retroUserId', this.userId!);
    if (body.username) localStorage.setItem('retroUserName', body.username);
    return this.userId!;
  }

  async listBoards(): Promise<any[]> {
    await this.ensureUser();
    let res = await fetch(`${this.API_BASE}/api/boards?userId=${this.userId}`);
    if (res.status === 401) {
      await this.ensureUser();
      res = await fetch(`${this.API_BASE}/api/boards?userId=${this.userId}`);
    }
    return res.ok ? res.json() : [];
  }

  async createBoard(teamName: string, password: string) {
    await this.ensureUser();
    const res = await fetch(`${this.API_BASE}/api/boards`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: this.userId, teamName, password })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Create board failed');
    return res.json();
  }

  async deleteBoard(boardId: string) {
    await this.ensureUser();
    const res = await fetch(`${this.API_BASE}/api/boards/${boardId}?userId=${this.userId}`, { method: 'DELETE' });
    return res.json();
  }

  async joinBoard(boardId: string, password: string): Promise<BoardMeta> {
    await this.ensureUser();
    const res = await fetch(`${this.API_BASE}/api/boards/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boardId, password })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Join failed');
    
    const rawMeta = await res.json();
    const meta: BoardMeta = {
      id: rawMeta.boardId,
      teamName: rawMeta.teamName,
      createdAt: rawMeta.createdAt,
      ownerId: rawMeta.ownerId
    };

    if (!this.socket) {
      this.socket = io(this.API_BASE);
      
      this.socket.on('boardState', (columns: Column[]) => {
        console.log('\n🟢 [NETWORK] Received FULL boardState from server.');
        this.store.dispatch(AstraActions.boardStateReceived({ columns }));
      });
      
      this.socket.on('connect_error', (err) => console.warn('socket connect error', err));
    }

    return new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('join timeout')), 6000);
      const onBoardState = () => {
        clearTimeout(to);
        resolve(meta);
      };
      
      // Add the "!" operator to bypass the strict undefined check
      this.socket!.once('boardState', onBoardState);
      this.socket!.emit('joinBoard', { boardId, password, userId: this.userId });
    });
  }

  async probeBoard(boardId: string, password: string): Promise<{ boardId: string; teamName: string; createdAt: number; ownerId?: string }> {
    const res = await fetch(`${this.API_BASE}/api/boards/join`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boardId, password })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Probe failed');
    return res.json();
  }

  getCurrentUserId(): string | undefined {
    return this.userId;
  }

  addCard(boardId: string, columnKey: string, text: string) {
    if (!this.userId) return;
    this.socket?.emit('addCard', { boardId, columnKey, text, userId: this.userId });
  }

  deleteCard(boardId: string, columnKey: string, cardId: string) {
    if (!this.userId) return;
    this.socket?.emit('deleteCard', { boardId, columnKey, cardId, userId: this.userId });
  }
  
  upvoteCard(boardId: string, columnKey: string, cardId: string, userId?: string) {
    const effectiveUserId = userId || this.userId;
    if (!effectiveUserId) return;
    this.socket?.emit('upvoteCard', { boardId, columnKey, cardId, userId: effectiveUserId });
  }
  
  reorderCards(boardId: string, columnKey: string, previousIndex: number, currentIndex: number) {
    this.socket?.emit('reorderCards', { boardId, columnKey, previousIndex, currentIndex });
  }

  async downloadPdf(boardId: string) {
    const res = await fetch(`${this.API_BASE}/api/boards/${boardId}/pdf`);
    if (!res.ok) throw new Error('PDF failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retro-${boardId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}