import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';

// 1. Import NgRx Core Providers
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';

// 2. Import our ASTRA feature
import { astraReducer } from './store/astra.reducer';
import { AstraEffects } from './store/astra.effects';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'board/:id',
    loadComponent: () =>
      import('./board-page/board-page.component').then((m) => m.BoardPageComponent),
  },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),

    // 3. Initialize the Global Store (The empty giant object)
    provideStore(), 

    // 4. Attach the 'astra' slice to the Global Store!
    // This exact string ('astra') is what your createFeatureSelector is looking for.
    provideState({ name: 'astra', reducer: astraReducer }),

    // 5. Start the background listeners
    provideEffects([AstraEffects]),

    // 6. Enable Time-Travel Debugging (Optional but highly recommended)
    provideStoreDevtools({ maxAge: 25, logOnly: false })
  ],
};
