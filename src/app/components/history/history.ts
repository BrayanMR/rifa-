import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RaffleService, LogEntry } from '../../services/raffle.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history.html'
})
export class HistoryComponent {
  public raffleService = inject(RaffleService);

  // Search & Filter state
  public searchLogQuery = signal<string>('');
  public filterAction = signal<string>('all');

  // Filtered logs
  public filteredLogs = computed(() => {
    const list = this.raffleService.logs();
    const query = this.searchLogQuery().trim().toLowerCase();
    const action = this.filterAction();

    return list.filter(l => {
      const matchesQuery = l.action.toLowerCase().includes(query) || 
                           l.details.toLowerCase().includes(query) ||
                           l.user.toLowerCase().includes(query);

      const matchesAction = action === 'all' || l.action.includes(action);

      return matchesQuery && matchesAction;
    });
  });

  public onClearLogs(): void {
    if (confirm('¿Seguro que deseas limpiar todo el historial de auditoría? Esta acción es irreversible y vaciará los logs locales.')) {
      this.raffleService.logs.set([]);
      this.raffleService.logAction('Limpieza de Historial', 'Se eliminó todo el registro de auditoría local.');
      this.raffleService.showToast('Historial de logs limpiado', 'warning');
    }
  }
}
