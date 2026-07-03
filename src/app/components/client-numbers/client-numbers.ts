import { Component, inject, signal, OnInit } from '@angular/core';
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

  // Selected numbers for multi-selection
  public selectedNumbers = signal<number[]>([]);

  // Booking Modal state
  public isReserveModalOpen = signal<boolean>(false);

  // Form Fields (Name only!)
  public clientName = signal<string>('');

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

  public getNumberClass(status: string, num: number): string {
    // Check if it is currently selected by the customer
    if (this.selectedNumbers().includes(num)) {
      return 'bg-teal-500 text-white scale-105 border-2 border-white dark:border-teal-400 shadow-md shadow-teal-500/35 ring-4 ring-teal-500/25';
    }

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
      const current = this.selectedNumbers();
      if (current.includes(num)) {
        // Toggle off
        this.selectedNumbers.set(current.filter(n => n !== num));
      } else {
        // Toggle on
        this.selectedNumbers.set([...current, num]);
      }
    } else {
      const p = this.getNumberParticipant(num);
      const owner = p ? ` por ${this.getShortName(p.name)}` : '';
      this.raffleService.showToast(`El número ${num} ya está ocupado${owner}. Elige otro número disponible.`, 'warning', 3000);
    }
  }

  public openReserveModal(): void {
    if (this.selectedNumbers().length === 0) {
      this.raffleService.showToast('Selecciona al menos un número para reservar.', 'warning');
      return;
    }
    this.clientName.set('');
    this.isReserveModalOpen.set(true);
  }

  public onReserveSubmit(): void {
    if (!this.clientName().trim()) {
      this.raffleService.showToast('Completa tu nombre para reservar.', 'error');
      return;
    }

    const numbersToReserve = [...this.selectedNumbers()];
    let successCount = 0;
    let failedNumbers: number[] = [];

    for (const num of numbersToReserve) {
      const res = this.raffleService.reserveNumber(
        this.selectedRaffleId(),
        num,
        this.clientName().trim(),
        '', // No phone number required
        'reserved'
      );

      if (res.success) {
        successCount++;
      } else {
        failedNumbers.push(num);
      }
    }

    if (successCount > 0) {
      this.isReserveModalOpen.set(false);
      this.selectedNumbers.set([]); // Clear selection list
    }

    if (failedNumbers.length > 0) {
      this.raffleService.showToast(`No se pudieron reservar los números: ${failedNumbers.join(', ')}. Ya fueron ocupados.`, 'error', 5000);
    }
  }
}
