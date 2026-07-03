import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RaffleService } from '../../services/raffle.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  private raffleService = inject(RaffleService);
  private router = inject(Router);

  public isSignUpMode = signal<boolean>(false);
  public email = signal<string>('admin@rifas.com');
  public password = signal<string>('admin2026');
  public showPassword = signal<boolean>(false);
  public rememberMe = signal<boolean>(true);
  public isLoading = signal<boolean>(false);
  public errorMessage = signal<string | null>(null);

  constructor() {
    // If already logged in, redirect to dashboard
    if (this.raffleService.currentUser()) {
      this.router.navigate(['/dashboard']);
    }
  }

  public togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  public toggleAuthMode(): void {
    this.isSignUpMode.update(mode => !mode);
    this.errorMessage.set(null);
  }

  public async onSubmit(): Promise<void> {
    if (!this.email() || !this.password()) {
      this.errorMessage.set('Por favor, completa todos los campos.');
      return;
    }

    console.log('[LoginComponent] Enviando formulario. Modo Registro:', this.isSignUpMode());
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      let success = false;
      if (this.isSignUpMode()) {
        console.log('[LoginComponent] Llamando a signUp()...');
        success = await this.raffleService.signUp(this.email(), this.password());
      } else {
        console.log('[LoginComponent] Llamando a login()...');
        success = await this.raffleService.login(this.email(), this.password());
      }

      console.log('[LoginComponent] Resultado de autenticación:', success);
      this.isLoading.set(false);
      
      if (success) {
        console.log('[LoginComponent] Redirigiendo a /dashboard...');
        this.router.navigate(['/dashboard']);
      } else if (!this.isSignUpMode()) {
        this.errorMessage.set('Correo o contraseña incorrectos.');
      }
    } catch (err) {
      console.error('[LoginComponent] Excepción capturada en onSubmit:', err);
      this.isLoading.set(false);
      this.errorMessage.set('Error al conectar con el servidor.');
    }
  }

  public onForgotPassword(): void {
    this.raffleService.showToast('Demo: Usa admin@rifas.com y admin2026 para ingresar.', 'info', 6000);
  }
}
