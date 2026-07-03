import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { DashboardComponent } from './components/dashboard/dashboard';
import { RafflesComponent } from './components/raffles/raffles';
import { NumbersComponent } from './components/numbers/numbers';
import { ClientNumbersComponent } from './components/client-numbers/client-numbers';
import { ParticipantsComponent } from './components/participants/participants';
import { AnalyticsComponent } from './components/analytics/analytics';
import { HistoryComponent } from './components/history/history';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'numbers', component: ClientNumbersComponent },
  { path: 'admin/numbers', component: NumbersComponent, canActivate: [authGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'raffles', component: RafflesComponent, canActivate: [authGuard] },
  { path: 'participants', component: ParticipantsComponent, canActivate: [authGuard] },
  { path: 'analytics', component: AnalyticsComponent, canActivate: [authGuard] },
  { path: 'history', component: HistoryComponent, canActivate: [authGuard] },
  { path: '', redirectTo: 'numbers', pathMatch: 'full' },
  { path: '**', redirectTo: 'numbers' }
];
