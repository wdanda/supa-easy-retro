
import { Component, inject, OnInit } from '@angular/core';
import { SocketService, Column } from '../services/socket.service';
import { Observable } from 'rxjs';
import { ColumnComponent } from '../column/column.component';
import { CommonModule } from '@angular/common';

// 1. Import your new Selector and Actions
import { selectFilteredColumns } from '../store/astra.selectors';
import * as AstraActions from '../store/astra.actions';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, ColumnComponent],
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss']
})
export class BoardComponent implements OnInit {
  columns$!: Observable<Column[]>;
  
  private store = inject(Store);

  // constructor(private socketService: SocketService) {}

  ngOnInit() {
    // this.columns$ = this.socketService.filteredColumns$;
    this.columns$ = this.store.select(selectFilteredColumns);
  }
  
  onSearchInput(event: Event) {
    const target = event.target as HTMLInputElement;

    // this.socketService.setSearchTerm(target.value);
    this.store.dispatch(AstraActions.updateSearchTerm({ term: target.value }));
  }

  trackByColumnKey(_index: number, column: Column): string {
    return column.key;
  }
}
