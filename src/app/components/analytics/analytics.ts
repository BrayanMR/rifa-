import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RaffleService, Participant, Raffle } from '../../services/raffle.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.html'
})
export class AnalyticsComponent {
  public raffleService = inject(RaffleService);

  // Computeds for metrics
  public metrics = computed(() => {
    const participants = this.raffleService.participants();
    const raffles = this.raffleService.raffles();
    
    let totalSlots = 0;
    raffles.forEach(r => totalSlots += r.numbersCount);

    const reserved = participants.filter(p => p.status === 'reserved').length;
    const paid = participants.filter(p => p.status === 'paid').length;
    const blocked = participants.filter(p => p.status === 'blocked').length;
    const expired = participants.filter(p => p.status === 'expired').length;
    const occupied = reserved + paid + blocked;
    const available = Math.max(0, totalSlots - occupied);

    const percentOcupation = totalSlots > 0 ? (occupied / totalSlots * 100) : 0;
    const percentPaid = occupied > 0 ? (paid / occupied * 100) : 0;

    return {
      totalSlots,
      available,
      reserved,
      paid,
      blocked,
      expired,
      occupied,
      percentOcupation,
      percentPaid
    };
  });

  // 1. Donut SVG Wedges Computation
  public donutData = computed(() => {
    const m = this.metrics();
    const total = m.totalSlots || 1; // prevent zero division
    
    const segments = [
      { name: 'Pagado', value: m.paid, color: 'var(--color-paid)', class: 'stroke-blue-500' },
      { name: 'Reservado', value: m.reserved, color: 'var(--color-reserved)', class: 'stroke-amber-500' },
      { name: 'Bloqueado', value: m.blocked, color: 'var(--color-blocked)', class: 'stroke-slate-500' },
      { name: 'Disponible', value: m.available, color: 'var(--color-available)', class: 'stroke-emerald-500' }
    ];

    const circumference = 2 * Math.PI * 50; // r=50 -> ~314.159
    let currentOffset = 0;

    return segments.map(s => {
      const percentage = (s.value / total) * 100;
      const strokeLength = (s.value / total) * circumference;
      const strokeOffset = circumference - strokeLength + currentOffset;
      
      // Accumulate for next segment
      currentOffset -= strokeLength;

      return {
        ...s,
        percentage,
        strokeLength,
        strokeOffset,
        dashArray: `${strokeLength} ${circumference - strokeLength}`
      };
    });
  });

  // 2. Bar Chart SVG Wedges (Raffles bookings)
  public barChartData = computed(() => {
    const raffles = this.raffleService.raffles();
    const participants = this.raffleService.participants();

    const data = raffles.map(r => {
      const occupied = participants.filter(p => 
        p.raffleId === r.id && (p.status === 'reserved' || p.status === 'paid' || p.status === 'blocked')
      ).length;
      
      const percent = r.numbersCount > 0 ? (occupied / r.numbersCount * 100) : 0;

      return {
        id: r.id,
        name: r.name,
        occupied,
        total: r.numbersCount,
        percent,
        color: r.color
      };
    });

    const maxVal = Math.max(...data.map(d => d.occupied), 5); // at least 5 for scaling
    
    const svgWidth = 600;
    const svgHeight = 220;
    const padding = 40;
    const plotWidth = svgWidth - padding * 2;
    const plotHeight = svgHeight - padding * 2;

    const barWidth = Math.min(60, plotWidth / (data.length || 1) * 0.6);
    const gap = (plotWidth - (barWidth * data.length)) / ((data.length - 1) || 1);

    const bars = data.map((d, index) => {
      const height = (d.occupied / maxVal) * plotHeight;
      const x = padding + index * (barWidth + gap);
      const y = svgHeight - padding - height;

      return {
        ...d,
        x,
        y,
        width: barWidth,
        height: Math.max(height, 2), // min height to show bar
        labelX: x + barWidth / 2,
        labelY: svgHeight - padding + 18,
        valY: y - 8
      };
    });

    return {
      bars,
      svgWidth,
      svgHeight,
      maxVal,
      plotHeight,
      padding
    };
  });

  // 3. Line Chart SVG (Bookings over the last 5 days)
  public lineChartData = computed(() => {
    const participants = this.raffleService.participants();
    
    // Generate dates for the last 5 days
    const dates: string[] = [];
    for (let i = 4; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const points = dates.map((dateStr, index) => {
      const count = participants.filter(p => p.date === dateStr).length;
      
      // format readable label (e.g. "02 Jul" or similar)
      const parts = dateStr.split('-');
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const readableLabel = `${parts[2]} ${monthNames[parseInt(parts[1]) - 1]}`;

      return {
        index,
        date: dateStr,
        label: readableLabel,
        count
      };
    });

    const maxCount = Math.max(...points.map(p => p.count), 4); // scale safeguard
    
    const svgWidth = 600;
    const svgHeight = 220;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;
    const plotWidth = svgWidth - paddingLeft - paddingRight;
    const plotHeight = svgHeight - paddingTop - paddingBottom;

    const xCoords = points.map((p, i) => paddingLeft + (i / (points.length - 1)) * plotWidth);
    const yCoords = points.map(p => svgHeight - paddingBottom - (p.count / maxCount) * plotHeight);

    // Build path coordinates string
    let pathD = '';
    let areaD = `M ${xCoords[0]} ${svgHeight - paddingBottom}`;

    points.forEach((p, i) => {
      if (i === 0) {
        pathD += `M ${xCoords[i]} ${yCoords[i]}`;
      } else {
        pathD += ` L ${xCoords[i]} ${yCoords[i]}`;
      }
      areaD += ` L ${xCoords[i]} ${yCoords[i]}`;
    });

    areaD += ` L ${xCoords[xCoords.length - 1]} ${svgHeight - paddingBottom} Z`;

    const mappedPoints = points.map((p, i) => ({
      ...p,
      x: xCoords[i],
      y: yCoords[i]
    }));

    return {
      points: mappedPoints,
      pathD,
      areaD,
      svgWidth,
      svgHeight,
      plotHeight,
      paddingLeft,
      paddingBottom,
      maxCount
    };
  });

  // Ranking calculation
  public rankingRaffles = computed(() => {
    const list = this.raffleService.raffles();
    const participants = this.raffleService.participants();

    return list.map(r => {
      const count = participants.filter(p => p.raffleId === r.id).length;
      const rate = r.numbersCount > 0 ? (count / r.numbersCount * 100) : 0;
      return {
        ...r,
        count,
        rate
      };
    }).sort((a, b) => b.count - a.count);
  });
}
