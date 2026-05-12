import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../services/socket.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  @Input() card!: Card;
  @Input() canDelete = true;
  @Input() canUpvote = true;
  @Output() delete = new EventEmitter<void>();
  @Output() upvote = new EventEmitter<void>();
}
