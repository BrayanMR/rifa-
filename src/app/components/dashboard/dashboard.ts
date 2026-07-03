import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RaffleService, Participant, Raffle } from '../../services/raffle.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html'
})
export class DashboardComponent {
  public raffleService = inject(RaffleService);

  // Computeds for metrics
  public totalRaffles = computed(() => this.raffleService.raffles().length);
  
  public activeRaffles = computed(() => 
    this.raffleService.raffles().filter(r => r.status === 'active').length
  );

  public completedRaffles = computed(() => 
    this.raffleService.raffles().filter(r => r.status === 'completed').length
  );

  public totalParticipants = computed(() => {
    // Uniq participants based on Name & Phone combination
    const participants = this.raffleService.participants();
    const unique = new Set(participants.map(p => `${p.name.toLowerCase()}_${p.phone}`));
    return unique.size;
  });

  public stats = computed(() => {
    const participants = this.raffleService.participants();
    const activeRaffles = this.raffleService.raffles();
    
    let totalSlots = 0;
    activeRaffles.forEach(r => totalSlots += r.numbersCount);

    const reserved = participants.filter(p => p.status === 'reserved').length;
    const paid = participants.filter(p => p.status === 'paid').length;
    const blocked = participants.filter(p => p.status === 'blocked').length;
    const expired = participants.filter(p => p.status === 'expired').length;
    const available = Math.max(0, totalSlots - (reserved + paid + blocked));

    return {
      available,
      reserved,
      paid,
      blocked,
      expired
    };
  });

  // Recent logs (take top 5)
  public recentLogs = computed(() => 
    this.raffleService.logs().slice(0, 5)
  );

  // Active reservations showing countdowns (take top 4 soonest to expire)
  public activeReservations = computed(() => {
    const now = Date.now();
    return this.raffleService.participants()
      .filter(p => p.status === 'reserved' && p.expiresAt && p.expiresAt > now)
      .map(p => {
        const raffle = this.raffleService.raffles().find(r => r.id === p.raffleId);
        const timeRemaining = p.expiresAt ? Math.max(0, Math.round((p.expiresAt - now) / 1000)) : 0;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        const countdownStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        return {
          ...p,
          raffleName: raffle ? raffle.name : 'Rifa',
          color: raffle ? raffle.color : '#64748b',
          countdownStr
        };
      })
      .sort((a, b) => (a.expiresAt || 0) - (b.expiresAt || 0))
      .slice(0, 4);
  });

  public getRaffleName(raffleId: string): string {
    const r = this.raffleService.raffles().find(item => item.id === raffleId);
    return r ? r.name : 'Rifa';
  }

  public getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Activa';
      case 'paused': return 'Pausada';
      case 'completed': return 'Finalizada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }

  public getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'paused': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
    }
  }

  public forceRelease(participantId: string): void {
    if (confirm('¿Seguro que deseas liberar este número antes de que expire el tiempo de espera?')) {
      this.raffleService.releaseNumber(participantId);
    }
  }
}
