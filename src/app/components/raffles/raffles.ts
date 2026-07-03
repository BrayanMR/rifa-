import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RaffleService, Raffle } from '../../services/raffle.service';

@Component({
  selector: 'app-raffles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './raffles.html'
})
export class RafflesComponent {
  public raffleService = inject(RaffleService);

  // Search & Filter state
  public searchQuery = signal<string>('');
  public filterStatus = signal<string>('all');
  public sortBy = signal<string>('date-desc');

  // Form Modal state
  public isModalOpen = signal<boolean>(false);
  public isEditing = signal<boolean>(false);
  public editingRaffleId = signal<string | null>(null);

  // Form Fields
  public name = signal<string>('');
  public description = signal<string>('');
  public image = signal<string>('');
  public price = signal<number>(10);
  public numbersCount = signal<number>(100);
  public status = signal<Raffle['status']>('active');
  public color = signal<string>('#3b82f6');

  // Predefined colors for raffle identify
  public colorsList = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#64748b'  // Slate
  ];

  // Filter and sort computed
  public filteredRaffles = computed(() => {
    const list = this.raffleService.raffles();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.filterStatus();
    const sort = this.sortBy();

    let result = list.filter(r => {
      const matchQuery = r.name.toLowerCase().includes(query) || 
                         r.description.toLowerCase().includes(query);
      const matchStatus = status === 'all' || r.status === status;
      return matchQuery && matchStatus;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sort === 'name-asc') return a.name.localeCompare(b.name);
      if (sort === 'name-desc') return b.name.localeCompare(a.name);
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'date-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      // default: date-desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  public openCreateModal(): void {
    this.isEditing.set(false);
    this.editingRaffleId.set(null);
    this.name.set('');
    this.description.set('');
    this.image.set('');
    this.price.set(10);
    this.numbersCount.set(100);
    this.status.set('active');
    this.color.set('#3b82f6');
    this.isModalOpen.set(true);
  }

  public openEditModal(raffle: Raffle): void {
    this.isEditing.set(true);
    this.editingRaffleId.set(raffle.id);
    this.name.set(raffle.name);
    this.description.set(raffle.description);
    this.image.set(raffle.image);
    this.price.set(raffle.price);
    this.numbersCount.set(raffle.numbersCount);
    this.status.set(raffle.status);
    this.color.set(raffle.color);
    this.isModalOpen.set(true);
  }

  public closeModal(): void {
    this.isModalOpen.set(false);
  }

  public onSave(): void {
    if (!this.name().trim() || this.price() <= 0 || this.numbersCount() <= 0) {
      this.raffleService.showToast('Por favor completa todos los campos correctamente.', 'error');
      return;
    }

    // Default image if empty
    const imgUrl = this.image().trim() || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80';

    const raffleData = {
      name: this.name().trim(),
      description: this.description().trim(),
      image: imgUrl,
      price: this.price(),
      numbersCount: this.numbersCount(),
      status: this.status(),
      color: this.color()
    };

    if (this.isEditing() && this.editingRaffleId()) {
      this.raffleService.updateRaffle(this.editingRaffleId()!, raffleData);
    } else {
      this.raffleService.createRaffle(raffleData);
    }
    
    this.closeModal();
  }

  public onDelete(id: string): void {
    if (confirm('¿Estás completamente seguro de eliminar esta rifa? Todos los participantes registrados y números vendidos se perderán definitivamente.')) {
      this.raffleService.deleteRaffle(id);
    }
  }

  public onDuplicate(id: string): void {
    this.raffleService.duplicateRaffle(id);
  }

  public getOccupancyInfo(raffleId: string, numbersCount: number) {
    const participants = this.raffleService.participants().filter(p => 
      p.raffleId === raffleId && (p.status === 'reserved' || p.status === 'paid' || p.status === 'blocked')
    );
    const count = participants.length;
    const percent = numbersCount > 0 ? (count / numbersCount * 100) : 0;
    return {
      count,
      percent
    };
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
}
