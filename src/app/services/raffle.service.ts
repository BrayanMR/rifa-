import { Injectable, signal, OnDestroy } from '@angular/core';
import { db, auth } from '../firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

export interface Raffle {
  id: string;
  name: string;
  image: string;
  description: string;
  price: number;
  numbersCount: number;
  createdAt: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  color: string;
}

export interface Participant {
  id: string;
  raffleId: string;
  name: string;
  phone: string;
  reservedNumber: number;
  date: string;
  time: string;
  status: 'reserved' | 'paid' | 'expired' | 'blocked';
  expiresAt?: number; // timestamp in ms
}

export interface LogEntry {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  details: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RaffleService implements OnDestroy {
  // Signals for state management
  public raffles = signal<Raffle[]>([]);
  public participants = signal<Participant[]>([]);
  public logs = signal<LogEntry[]>([]);
  public toasts = signal<Toast[]>([]);
  public currentUser = signal<string | null>(null);

  private authReadyResolve?: () => void;
  private authReadyPromise = new Promise<void>((resolve) => {
    this.authReadyResolve = resolve;
  });

  private timerIntervalId: any;
  private unsubscribeFunctions: (() => void)[] = [];

  public waitForAuthReady(): Promise<void> {
    return this.authReadyPromise;
  }

  constructor() {
    this.initializeFirebaseListeners();
    this.createAdminAccountOnce();
  }

  private async createAdminAccountOnce(): Promise<void> {
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      await createUserWithEmailAndPassword(auth, 'admin@rifas.com', 'admin2026');
      await this.logAction('Cuenta Admin Creada', 'Cuenta administrativa inicial creada en Firebase Auth.');
    } catch (err: any) {
      if (err.code !== 'auth/email-already-in-use') {
        console.error('Error creating default admin user:', err);
      }
    }
  }

  private initializeFirebaseListeners(): void {
    // 1. Auth state changed listener
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        this.currentUser.set(user.email || 'Administrador');
      } else {
        this.currentUser.set(null);
      }
      if (this.authReadyResolve) {
        this.authReadyResolve();
        // Nullify to prevent repeated calls on subsequent auth changes
        this.authReadyResolve = undefined;
      }
    });
    this.unsubscribeFunctions.push(unsubAuth);

    // 2. Raffles collection listener
    const unsubRaffles = onSnapshot(collection(db, 'raffles'), (snapshot) => {
      const list: Raffle[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Raffle);
      });
      
      // Sort by creation date desc
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      this.raffles.set(list);
    });
    this.unsubscribeFunctions.push(unsubRaffles);

    // 3. Participants collection listener
    const unsubParticipants = onSnapshot(collection(db, 'participants'), (snapshot) => {
      const list: Participant[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Participant);
      });
      this.participants.set(list);
    });
    this.unsubscribeFunctions.push(unsubParticipants);

    // 4. Logs collection listener (limit to last 50 for performance)
    const logsQuery = query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      const list: LogEntry[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as LogEntry);
      });
      this.logs.set(list);
    });
    this.unsubscribeFunctions.push(unsubLogs);
  }

  private async seedInitialFirestoreData(): Promise<void> {
    try {
      const defaultRaffles = [
        {
          name: 'Rifa Gran Carro 2026',
          description: 'Sorteo de un espectacular carro deportivo último modelo. ¡Participa y estrena este año!',
          image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600&auto=format&fit=crop&q=80',
          price: 50,
          numbersCount: 10,
          createdAt: new Date().toISOString(),
          status: 'active',
          color: '#3b82f6'
        },
        {
          name: 'Rifa iPhone 17 Pro Max',
          description: 'Sé el primero en tener el nuevo iPhone 17. Edición limitada de titanio.',
          image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600&auto=format&fit=crop&q=80',
          price: 15,
          numbersCount: 10,
          createdAt: new Date().toISOString(),
          status: 'active',
          color: '#f59e0b'
        },
        {
          name: 'Rifa Moto Sport 250cc',
          description: 'La moto perfecta para moverte por la ciudad con estilo y velocidad.',
          image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=600&auto=format&fit=crop&q=80',
          price: 25,
          numbersCount: 10,
          createdAt: new Date().toISOString(),
          status: 'paused',
          color: '#10b981'
        }
      ];

      for (const r of defaultRaffles) {
        await addDoc(collection(db, 'raffles'), r);
      }

      await addDoc(collection(db, 'logs'), {
        user: 'System',
        action: 'Base de Datos Inicializada',
        timestamp: new Date().toISOString(),
        details: 'Semillas iniciales de rifas insertadas en Firestore.'
      });
    } catch (err) {
      console.error('Error seeding initial Firestore data', err);
    }
  }

  // Notificaciones Toast
  public showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 4000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type, duration };
    
    this.toasts.update(current => [...current, newToast]);
    
    setTimeout(() => {
      this.removeToast(id);
    }, duration);
  }

  public removeToast(id: string): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  // Historial de Auditoría
  public async logAction(action: string, details: string): Promise<void> {
    try {
      await addDoc(collection(db, 'logs'), {
        user: this.currentUser() || 'Cliente/Público',
        action,
        timestamp: new Date().toISOString(),
        details
      });
    } catch (e) {
      console.error('Error writing log to Firestore', e);
    }
  }

  // Registrar nuevo admin
  public async signUp(email: string, password: string): Promise<boolean> {
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      this.currentUser.set(userCredential.user.email || 'Administrador');
      
      this.logAction('Cuenta Admin Creada', `Se registró un nuevo administrador: ${email}`);
      this.showToast('Cuenta administrativa registrada con éxito', 'success');
      return true;
    } catch (err: any) {
      console.error('Error signing up', err);
      let errMsg = 'Error al registrar la cuenta.';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Este correo ya está registrado.';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'El correo electrónico no es válido.';
      }
      this.showToast(errMsg, 'error');
      return false;
    }
  }

  // Autenticación con Firebase Auth
  public async login(email: string, password: string): Promise<boolean> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      this.currentUser.set(userCredential.user.email || 'Administrador');
      
      this.logAction('Inicio de Sesión', `El administrador (${email}) ingresó al sistema.`);
      this.showToast('Sesión iniciada con éxito', 'success');
      return true;
    } catch (err: any) {
      console.error('Error signing in', err);
      let errMsg = 'Error de inicio de sesión.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errMsg = 'Credenciales incorrectas.';
      }
      this.showToast(errMsg, 'error');
      return false;
    }
  }

  public async logout(): Promise<void> {
    try {
      const email = this.currentUser();
      await signOut(auth);
      await this.logAction('Cierre de Sesión', `El administrador (${email}) cerró su sesión.`);
      this.showToast('Sesión cerrada correctamente', 'info');
    } catch (err) {
      console.error('Error signing out', err);
      this.showToast('Error al cerrar sesión', 'error');
    }
  }

  // CRUD Rifas
  public async createRaffle(raffle: Omit<Raffle, 'id' | 'createdAt'>): Promise<void> {
    try {
      const newRaffle = {
        ...raffle,
        createdAt: new Date().toISOString()
      };
      const docRef = await addDoc(collection(db, 'raffles'), newRaffle);
      await this.logAction('Creación de Rifa', `Rifa "${newRaffle.name}" creada en Firestore con ID ${docRef.id}.`);
      this.showToast('Rifa creada correctamente', 'success');
    } catch (err) {
      console.error('Error creating raffle', err);
      this.showToast('Error al crear la rifa', 'error');
    }
  }

  public async updateRaffle(id: string, updatedRaffle: Partial<Raffle>): Promise<void> {
    try {
      await updateDoc(doc(db, 'raffles', id), updatedRaffle);
      const raffle = this.raffles().find(r => r.id === id);
      await this.logAction('Edición de Rifa', `Rifa "${raffle?.name}" (ID ${id}) editada en Firestore.`);
      this.showToast('Rifa actualizada', 'success');
    } catch (err) {
      console.error('Error updating raffle', err);
      this.showToast('Error al actualizar la rifa', 'error');
    }
  }

  public async deleteRaffle(id: string): Promise<void> {
    try {
      const raffle = this.raffles().find(r => r.id === id);
      
      // Delete associated participants
      const associated = this.participants().filter(p => p.raffleId === id);
      for (const p of associated) {
        await deleteDoc(doc(db, 'participants', p.id));
      }

      await deleteDoc(doc(db, 'raffles', id));
      await this.logAction('Eliminación de Rifa', `Rifa "${raffle?.name}" y sus ${associated.length} participantes fueron eliminados.`);
      this.showToast('Rifa eliminada', 'warning');
    } catch (err) {
      console.error('Error deleting raffle', err);
      this.showToast('Error al eliminar la rifa', 'error');
    }
  }

  public async duplicateRaffle(id: string): Promise<void> {
    const target = this.raffles().find(r => r.id === id);
    if (!target) return;

    try {
      const duplicate = {
        name: `${target.name} (Copia)`,
        description: target.description,
        image: target.image,
        price: target.price,
        numbersCount: target.numbersCount,
        status: target.status,
        color: target.color,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'raffles'), duplicate);
      await this.logAction('Duplicación de Rifa', `Rifa "${target.name}" duplicada como "${duplicate.name}" (ID ${docRef.id}).`);
      this.showToast('Rifa duplicada con éxito', 'success');
    } catch (err) {
      console.error('Error duplicating raffle', err);
      this.showToast('Error al duplicar la rifa', 'error');
    }
  }



  // CRUD Participantes & Reservas
  public reserveNumber(raffleId: string, number: number, name: string, phone: string, status: 'reserved' | 'paid' | 'blocked' = 'reserved', durationMinutes: number = 15): { success: boolean, error?: string } {
    const cleanedName = name.trim();
    const cleanedPhone = phone.trim();

    if (!cleanedName) {
      return { success: false, error: 'El nombre es requerido.' };
    }

    // Regla 1: Validar si el número está ocupado
    const taken = this.participants().find(p => 
      p.raffleId === raffleId && 
      p.reservedNumber === number && 
      (p.status === 'reserved' || p.status === 'paid' || p.status === 'blocked')
    );
    if (taken) {
      return { success: false, error: `El número ${number} ya está registrado.` };
    }



    // Guardar en Firestore
    try {
      const now = new Date();

      const participantData: any = {
        raffleId,
        name: cleanedName,
        phone: cleanedPhone,
        reservedNumber: number,
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0].substring(0, 5),
        status
      };

      addDoc(collection(db, 'participants'), participantData).then((docRef) => {
        const raffle = this.raffles().find(r => r.id === raffleId);
        this.logAction('Registro de Número', `Número ${number} reservado para ${cleanedName} en "${raffle?.name}" (ID ${docRef.id}).`);
      });

      this.showToast(`Número ${number} apartado con éxito`, 'success');
      return { success: true };
    } catch (err) {
      console.error('Error reserving number', err);
      return { success: false, error: 'Error al conectar con la base de datos.' };
    }
  }

  public async updateParticipantStatus(participantId: string, status: 'reserved' | 'paid' | 'expired' | 'blocked'): Promise<void> {
    try {
      const updateData: any = { status };

      await updateDoc(doc(db, 'participants', participantId), updateData);
      
      const p = this.participants().find(part => part.id === participantId);
      const raffle = this.raffles().find(r => r.id === p?.raffleId);
      await this.logAction('Estado de Número Actualizado', `Número ${p?.reservedNumber} de la rifa "${raffle?.name}" cambió a ${status.toUpperCase()}.`);
      this.showToast(`Estado cambiado a ${status.toUpperCase()}`, 'success');
    } catch (err) {
      console.error('Error updating participant status', err);
      this.showToast('Error al actualizar el estado', 'error');
    }
  }

  public async releaseNumber(participantId: string): Promise<void> {
    try {
      const target = this.participants().find(p => p.id === participantId);
      if (!target) return;

      await deleteDoc(doc(db, 'participants', participantId));
      
      const raffle = this.raffles().find(r => r.id === target.raffleId);
      await this.logAction('Liberación de Número', `Número ${target.reservedNumber} liberado. Anteriormente de ${target.name} en "${raffle?.name}".`);
      this.showToast(`Número ${target.reservedNumber} liberado`, 'info');
    } catch (err) {
      console.error('Error releasing number', err);
      this.showToast('Error al liberar el número', 'error');
    }
  }

  // Exportaciones
  public exportToCSV(raffleId: string): void {
    const raffle = this.raffles().find(r => r.id === raffleId);
    if (!raffle) return;

    const raffleParticipants = this.participants().filter(p => p.raffleId === raffleId);
    
    let csvContent = '\ufeff'; // UTF-8 BOM
    csvContent += 'Numero,Nombre Participante,Celular,Fecha,Hora,Estado\n';
    
    for (let i = 0; i < raffle.numbersCount; i++) {
      const p = raffleParticipants.find(part => part.reservedNumber === i);
      if (p) {
        csvContent += `${i},"${p.name}","${p.phone}",${p.date},${p.time},${p.status.toUpperCase()}\n`;
      } else {
        csvContent += `${i},Disponible,-,-,-,DISPONIBLE\n`;
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rifa_${raffle.name.replace(/\s+/g, '_')}_Participantes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.logAction('Exportación CSV', `Se exportó el listado de participantes para "${raffle.name}" en formato CSV.`);
    this.showToast('Exportación CSV iniciada', 'success');
  }

  public exportToExcel(raffleId: string): void {
    const raffle = this.raffles().find(r => r.id === raffleId);
    if (!raffle) return;

    const raffleParticipants = this.participants().filter(p => p.raffleId === raffleId);
    
    let xml = `<?xml version="1.0"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
     xmlns:o="urn:schemas-microsoft-com:office:office"
     xmlns:x="urn:schemas-microsoft-com:office:excel"
     xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
     xmlns:html="http://www.w3.org/TR/REC-html40">
     <Worksheet ss:Name="Participantes">
      <Table>
       <Row>
        <Cell><Data ss:Type="String">Número</Data></Cell>
        <Cell><Data ss:Type="String">Nombre Completo</Data></Cell>
        <Cell><Data ss:Type="String">Teléfono / Celular</Data></Cell>
        <Cell><Data ss:Type="String">Fecha Registro</Data></Cell>
        <Cell><Data ss:Type="String">Hora Registro</Data></Cell>
        <Cell><Data ss:Type="String">Estado Actual</Data></Cell>
       </Row>`;

    for (let i = 0; i < raffle.numbersCount; i++) {
      const p = raffleParticipants.find(part => part.reservedNumber === i);
      if (p) {
        xml += `
       <Row>
        <Cell><Data ss:Type="Number">${i}</Data></Cell>
        <Cell><Data ss:Type="String">${p.name}</Data></Cell>
        <Cell><Data ss:Type="String">${p.phone}</Data></Cell>
        <Cell><Data ss:Type="String">${p.date}</Data></Cell>
        <Cell><Data ss:Type="String">${p.time}</Data></Cell>
        <Cell><Data ss:Type="String">${p.status.toUpperCase()}</Data></Cell>
       </Row>`;
      } else {
        xml += `
       <Row>
        <Cell><Data ss:Type="Number">${i}</Data></Cell>
        <Cell><Data ss:Type="String">Disponible</Data></Cell>
        <Cell><Data ss:Type="String">-</Data></Cell>
        <Cell><Data ss:Type="String">-</Data></Cell>
        <Cell><Data ss:Type="String">-</Data></Cell>
        <Cell><Data ss:Type="String">DISPONIBLE</Data></Cell>
       </Row>`;
      }
    }

    xml += `
      </Table>
     </Worksheet>
    </Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rifa_${raffle.name.replace(/\s+/g, '_')}_Participantes.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.logAction('Exportación Excel', `Se exportó el listado de participantes para "${raffle.name}" en formato Excel.`);
    this.showToast('Exportación Excel iniciada', 'success');
  }

  ngOnDestroy(): void {
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
    }
    this.unsubscribeFunctions.forEach(unsub => unsub());
  }
}
