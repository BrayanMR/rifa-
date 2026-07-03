import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { RaffleService } from '../../../services/raffle.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html'
})
export class SidebarComponent implements OnInit {
  public raffleService = inject(RaffleService);
  private router = inject(Router);

  public isCollapsed = signal<boolean>(false);
  public isDarkMode = signal<boolean>(false);

  ngOnInit(): void {
    // Check initial theme preference
    const isDark = document.documentElement.classList.contains('dark') || 
                   localStorage.getItem('theme') === 'dark' ||
                   (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    this.isDarkMode.set(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  public toggleCollapse(): void {
    this.isCollapsed.update(c => !c);
  }

  public toggleTheme(): void {
    this.isDarkMode.update(dark => {
      const newVal = !dark;
      if (newVal) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        this.raffleService.showToast('Modo Oscuro activado', 'info', 2000);
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        this.raffleService.showToast('Modo Claro activado', 'info', 2000);
      }
      return newVal;
    });
  }

  public onLogout(): void {
    if (confirm('¿Seguro que deseas cerrar la sesión?')) {
      this.raffleService.logout();
      this.router.navigate(['/login']);
    }
  }
}
