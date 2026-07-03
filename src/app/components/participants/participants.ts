import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RaffleService, Participant } from '../../services/raffle.service';

@Component({
  selector: 'app-participants',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './participants.html'
})
export class ParticipantsComponent {
  public raffleService = inject(RaffleService);

  // Search & Filter state
  public searchNameQuery = signal<string>('');
  public filterStatus = signal<string>('all');
  public selectedRaffleId = signal<string>('all');

  // Filtered participants list
  public filteredParticipants = computed(() => {
    const list = this.raffleService.participants();
    const query = this.searchNameQuery().trim().toLowerCase();
    const status = this.filterStatus();
    const raffleId = this.selectedRaffleId();

    return list.filter(p => {
      const raffle = this.raffleService.raffles().find(r => r.id === p.raffleId);
      const raffleName = raffle ? raffle.name.toLowerCase() : '';

      const matchesQuery = p.name.toLowerCase().includes(query) || 
                           p.phone.includes(query) ||
                           p.reservedNumber.toString() === query ||
                           raffleName.includes(query);

      const matchesStatus = status === 'all' || p.status === status;
      const matchesRaffle = raffleId === 'all' || p.raffleId === raffleId;

      return matchesQuery && matchesStatus && matchesRaffle;
    }).sort((a, b) => {
      // Sort by date/time desc (most recent first)
      const dateA = new Date(`${a.date}T${a.time}`).getTime();
      const borderB = new Date(`${b.date}T${b.time}`).getTime();
      return borderB - dateA;
    });
  });

  public getRaffleName(raffleId: string): string {
    const r = this.raffleService.raffles().find(item => item.id === raffleId);
    return r ? r.name : 'Rifa';
  }

  public getRaffleColor(raffleId: string): string {
    const r = this.raffleService.raffles().find(item => item.id === raffleId);
    return r ? r.color : '#64748b';
  }

  public getStatusText(status: string): string {
    switch (status) {
      case 'reserved': return 'Reservado';
      case 'paid': return 'Pagado';
      case 'expired': return 'Vencido';
      case 'blocked': return 'Bloqueado';
      default: return status;
    }
  }

  public getStatusClass(status: string): string {
    switch (status) {
      case 'reserved': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'paid': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'expired': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      case 'blocked': return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
      default: return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
    }
  }

  public markAsPaid(participantId: string): void {
    this.raffleService.updateParticipantStatus(participantId, 'paid');
  }

  public onRelease(participant: Participant): void {
    if (confirm(`¿Seguro que deseas liberar el número ${participant.reservedNumber}? Se eliminará el registro de ${participant.name}.`)) {
      this.raffleService.releaseNumber(participant.id);
    }
  }
}
