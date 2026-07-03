import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RaffleService } from '../../../services/raffle.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html'
})
export class NotificationsComponent {
  public raffleService = inject(RaffleService);

  public dismiss(id: string): void {
    this.raffleService.removeToast(id);
  }
}
