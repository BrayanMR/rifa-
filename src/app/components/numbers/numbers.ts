import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RaffleService, Participant, Raffle } from '../../services/raffle.service';

@Component({
  selector: 'app-numbers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './numbers.html'
})
export class NumbersComponent implements OnInit, OnDestroy {
  public raffleService = inject(RaffleService);

  // Selected raffle ID
  public selectedRaffleId = signal<string>('');

  // Search & Filter
  public searchNumQuery = signal<string>('');
  public filterStatus = signal<string>('all');

  // Modals state
  public isReserveModalOpen = signal<boolean>(false);
  public isDetailModalOpen = signal<boolean>(false);
  public selectedNumber = signal<number | null>(null);
  public selectedParticipant = signal<Participant | null>(null);

  // Reservation Form (Agile: name and phone only)
  public clientName = signal<string>('');
  public clientPhone = signal<string>('');
  public reserveStatus = signal<'reserved' | 'paid' | 'blocked'>('reserved');

  private uiIntervalId: any;
  public detailCountdown = signal<string>('');

  ngOnInit(): void {
    // Select first active raffle as default
    const active = this.raffleService.raffles();
    if (active.length > 0) {
      this.selectedRaffleId.set(active[0].id);
    }

    // Refresh countdown inside modal every second
    this.uiIntervalId = setInterval(() => {
      this.updateDetailCountdown();
    }, 1000);
  }

  public onRaffleChange(id: string): void {
    this.selectedRaffleId.set(id);
    this.closeModals();
  }

  public getSelectedRaffle(): Raffle | undefined {
    return this.raffleService.raffles().find(r => r.id === this.selectedRaffleId());
  }

  // Get participant active for a number in the current raffle
  public getNumberParticipant(num: number): Participant | undefined {
    return this.raffleService.participants().find(p => 
      p.raffleId === this.selectedRaffleId() && p.reservedNumber === num
    );
  }

  // Calculate grid numbers matching current search & filters
  public getNumbersList() {
    const raffle = this.getSelectedRaffle();
    if (!raffle) return [];

    const list: any[] = [];
    const query = this.searchNumQuery().trim().toLowerCase();
    const statusFilter = this.filterStatus();

    for (let i = 0; i < raffle.numbersCount; i++) {
      const p = this.getNumberParticipant(i);
      let status: 'available' | 'reserved' | 'paid' | 'expired' | 'blocked' = 'available';
      if (p) status = p.status;

      // Filter matches
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const matchesSearch = query === '' || 
                            i.toString() === query || 
                            (p && p.name.toLowerCase().includes(query)) ||
                            (p && p.phone.includes(query));

      if (matchesStatus && matchesSearch) {
        list.push({
          num: i,
          status,
          participant: p
        });
      }
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

  public getNumberStatusText(status: string): string {
    switch (status) {
      case 'reserved': return 'Reservado';
      case 'paid': return 'Pagado';
      case 'expired': return 'Vencido';
      case 'blocked': return 'Bloqueado';
      default: return 'Disponible';
    }
  }

  public onNumberClick(num: number, status: string, participant?: Participant): void {
    this.selectedNumber.set(num);
    
    const isAdmin = !!this.raffleService.currentUser();

    if (status === 'available' || status === 'expired') {
      // Clear forms
      this.clientName.set('');
      this.clientPhone.set('');
      this.reserveStatus.set('reserved');
      
      if (participant && isAdmin) {
        this.clientName.set(participant.name);
        this.clientPhone.set(participant.phone);
      }

      this.isReserveModalOpen.set(true);
    } else {
      if (isAdmin) {
        // Detail view for admin
        this.selectedParticipant.set(participant || null);
        this.updateDetailCountdown();
        this.isDetailModalOpen.set(true);
      } else {
        // Alert for public clients
        this.raffleService.showToast(`El número ${num} ya está ocupado.`, 'warning', 2500);
      }
    }
  }

  public closeModals(): void {
    this.isReserveModalOpen.set(false);
    this.isDetailModalOpen.set(false);
    this.selectedNumber.set(null);
    this.selectedParticipant.set(null);
  }

  public onReserveSubmit(): void {
    if (!this.clientName().trim() || !this.clientPhone().trim()) {
      this.raffleService.showToast('Nombre y Teléfono son obligatorios para registrar la reserva.', 'error');
      return;
    }

    const res = this.raffleService.reserveNumber(
      this.selectedRaffleId(),
      this.selectedNumber()!,
      this.clientName().trim(),
      this.clientPhone().trim(),
      this.reserveStatus()
    );

    if (res.success) {
      this.closeModals();
    } else {
      this.raffleService.showToast(res.error || 'Error al guardar.', 'error');
    }
  }

  public markAsPaid(): void {
    if (this.selectedParticipant()) {
      this.raffleService.updateParticipantStatus(this.selectedParticipant()!.id, 'paid');
      // Refresh detail modal
      const refreshed = this.raffleService.participants().find(p => p.id === this.selectedParticipant()!.id);
      this.selectedParticipant.set(refreshed || null);
      this.updateDetailCountdown();
    }
  }

  public forceExpirate(): void {
    if (this.selectedParticipant()) {
      if (confirm('¿Seguro que deseas expirar manualmente el tiempo de espera de esta reserva?')) {
        this.raffleService.updateParticipantStatus(this.selectedParticipant()!.id, 'expired');
        const refreshed = this.raffleService.participants().find(p => p.id === this.selectedParticipant()!.id);
        this.selectedParticipant.set(refreshed || null);
        this.updateDetailCountdown();
      }
    }
  }

  public onRelease(): void {
    if (this.selectedParticipant()) {
      if (confirm(`¿Seguro que deseas liberar el número ${this.selectedParticipant()!.reservedNumber}? Se eliminará el registro de este participante.`)) {
        this.raffleService.releaseNumber(this.selectedParticipant()!.id);
        this.closeModals();
      }
    }
  }

  private updateDetailCountdown(): void {
    const p = this.selectedParticipant();
    if (p && p.status === 'reserved' && p.expiresAt) {
      const now = Date.now();
      const timeRemaining = Math.max(0, Math.round((p.expiresAt - now) / 1000));
      
      if (timeRemaining <= 0) {
        this.detailCountdown.set('Expirado');
      } else {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        this.detailCountdown.set(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    } else {
      this.detailCountdown.set('');
    }
  }

  // Exports trigger
  public exportCSV(): void {
    this.raffleService.exportToCSV(this.selectedRaffleId());
  }

  public exportExcel(): void {
    this.raffleService.exportToExcel(this.selectedRaffleId());
  }

  public printRaffle(): void {
    window.print();
  }

  ngOnDestroy(): void {
    if (this.uiIntervalId) {
      clearInterval(this.uiIntervalId);
    }
  }
}
