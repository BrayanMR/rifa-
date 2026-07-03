import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RaffleService } from '../services/raffle.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const raffleService = inject(RaffleService);
  const router = inject(Router);

  console.log('[AuthGuard] Iniciando verificación de ruta:', state.url);

  // Wait for Firebase Auth to initialize and restore login state
  await raffleService.waitForAuthReady();
  
  const user = raffleService.currentUser();
  console.log('[AuthGuard] Auth listo. Usuario actual:', user);

  if (user) {
    return true;
  } else {
    console.warn('[AuthGuard] Acceso denegado, redirigiendo a /login');
    router.navigate(['/login']);
    return false;
  }
};
