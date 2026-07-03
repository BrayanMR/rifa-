import { Component, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './components/shared/sidebar/sidebar';
import { NotificationsComponent } from './components/shared/notifications/notifications';
import { RaffleService } from './services/raffle.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, NotificationsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  public raffleService = inject(RaffleService);
  private router = inject(Router);

  public showAdminLayout(): boolean {
    const currentUrl = this.router.url;
    // Hide layout for login and public client page (/numbers)
    const isPublicRoute = currentUrl.includes('/login') || currentUrl.includes('/numbers') || currentUrl === '/';
    return !!this.raffleService.currentUser() && !isPublicRoute;
  }
}
