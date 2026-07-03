import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RaffleService, Participant, Raffle } from '../../services/raffle.service';

@Component({
  selector: 'app-client-numbers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './client-numbers.html'
})
export class ClientNumbersComponent implements OnInit {
  public raffleService = inject(RaffleService);

  // Selected raffle ID
  public selectedRaffleId = signal<string>('');

  // Booking Modal state
  public isReserveModalOpen = signal<boolean>(false);
  public selectedNumber = signal<number | null>(null);

  // Form Fields (Agile: name and phone only)
  public clientName = signal<string>('');
  public clientPhone = signal<string>('');

  ngOnInit(): void {
    // Select first active raffle as default
    const active = this.raffleService.raffles().filter(r => r.status === 'active');
    if (active.length > 0) {
      this.selectedRaffleId.set(active[0].id);
    } else {
      const all = this.raffleService.raffles();
      if (all.length > 0) {
        this.selectedRaffleId.set(all[0].id);
      }
    }
  }

  public getSelectedRaffle(): Raffle | undefined {
    return this.raffleService.raffles().find(r => r.id === this.selectedRaffleId());
  }

  // Get active participant of a number
  public getNumberParticipant(num: number): Participant | undefined {
    return this.raffleService.participants().find(p => 
      p.raffleId === this.selectedRaffleId() && p.reservedNumber === num
    );
  }

  // Generate grid numbers list
  public getNumbersList() {
    const raffle = this.getSelectedRaffle();
    if (!raffle) return [];

    const list: any[] = [];
    for (let i = 0; i < raffle.numbersCount; i++) {
      const p = this.getNumberParticipant(i);
      let status: 'available' | 'reserved' | 'paid' | 'expired' | 'blocked' = 'available';
      if (p) status = p.status;

      list.push({
        num: i,
        status,
        participant: p
      });
    }
    return list;
  }

  public getNumberClass(status: string): string {
    switch (status) {
      case 'reserved': return 'bg-amber-500 text-white shadow-md shadow-amber-500/20 scale-100 hover:scale-105';
      case 'paid': return 'bg-blue-500 text-white shadow-md shadow-blue-500/20 scale-100 hover:scale-105';
      case 'expired': return 'bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-100 hover:scale-105';
      case 'blocked': return 'bg-slate-500 text-white shadow-md shadow-slate-500/10 scale-100';
      // available
      default: return 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:scale-105';
    }
  }

  public getShortName(fullName?: string): string {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return '';
    const firstName = parts[0];
    if (parts.length > 1 && parts[1]) {
      return `${firstName} ${parts[1][0]}.`;
    }
    return firstName;
  }

  public onNumberClick(num: number, status: string): void {
    if (status === 'available' || status === 'expired') {
      this.selectedNumber.set(num);
      this.clientName.set('');
      this.clientPhone.set('');
      this.isReserveModalOpen.set(true);
    } else {
      const p = this.getNumberParticipant(num);
      const owner = p ? ` por ${this.getShortName(p.name)}` : '';
      this.raffleService.showToast(`El número ${num} ya está ocupado${owner}. Elige otro número disponible.`, 'warning', 3000);
    }
  }

  public onReserveSubmit(): void {
    if (!this.clientName().trim() || !this.clientPhone().trim()) {
      this.raffleService.showToast('Completa tu nombre y teléfono para reservar.', 'error');
      return;
    }

    const res = this.raffleService.reserveNumber(
      this.selectedRaffleId(),
      this.selectedNumber()!,
      this.clientName().trim(),
      this.clientPhone().trim(),
      'reserved' // always defaults to reserved for public clients
    );

    if (res.success) {
      this.isReserveModalOpen.set(false);
      this.selectedNumber.set(null);
    } else {
      this.raffleService.showToast(res.error || 'Error al reservar.', 'error');
    }
  }
}
