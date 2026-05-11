import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Card } from '../services/socket.service';

@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() card!: Card;
  @Output() delete = new EventEmitter<void>();
  @Output() upvote = new EventEmitter<void>();
}
