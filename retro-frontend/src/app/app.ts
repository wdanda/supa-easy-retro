import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './header/header.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HeaderComponent, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('retro-frontend');
  showDisclaimer = localStorage.getItem('retroDisclaimerDismissed') !== '1';

  dismissDisclaimer() {
    this.showDisclaimer = false;
    localStorage.setItem('retroDisclaimerDismissed', '1');
  }
}
