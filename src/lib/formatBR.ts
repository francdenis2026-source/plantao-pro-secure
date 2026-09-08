/**
 * Utilitários de formatação para padrão brasileiro
 * Data: DD/MM/AAAA
 * Hora: HH:mm (24h)
 * Moeda: R$ 1.234,56
 */

/**
 * Formata uma data para o padrão brasileiro DD/MM/AAAA
 */
export function formatDateBR(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formata uma data para o padrão brasileiro curto DD/MM
 */
export function formatDateShortBR(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

/**
 * Formata uma data para exibição completa: "Segunda, 23 de Janeiro de 2026"
 */
export function formatDateFullBR(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formata hora para o padrão brasileiro HH:mm
 */
export function formatTimeBR(time: string | null | undefined): string {
  if (!time) return '-';
  
  // Se já está no formato HH:mm, retorna como está
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  
  // Se está no formato HH:mm:ss, remove os segundos
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
    return time.substring(0, 5);
  }
  
  return time;
}

/**
 * Formata data e hora para o padrão brasileiro: DD/MM/AAAA às HH:mm
 */
export function formatDateTimeBR(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const dateStr = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  
  const timeStr = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  return `${dateStr} às ${timeStr}`;
}

/**
 * Formata valor monetário para Real brasileiro: R$ 1.234,56
 */
export function formatCurrencyBR(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata número para o padrão brasileiro: 1.234,56
 */
export function formatNumberBR(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formata horas: +2h30min ou -1h15min
 */
export function formatHoursBR(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '0h';
  
  const sign = hours >= 0 ? '+' : '';
  const absHours = Math.abs(hours);
  const h = Math.floor(absHours);
  const m = Math.round((absHours - h) * 60);
  
  if (m === 0) {
    return `${sign}${hours >= 0 ? h : -h}h`;
  }
  
  return `${sign}${hours >= 0 ? h : -h}h${m}min`;
}

/**
 * Formata CPF: 000.000.000-00
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '-';
  
  // Remove tudo que não é número
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11) return cpf;
  
  return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function formatPhoneBR(phone: string | null | undefined): string {
  if (!phone) return '-';
  
  // Remove tudo que não é número
  const numbers = phone.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  if (numbers.length === 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

/**
 * Retorna data relativa em português: "há 2 minutos", "ontem", etc.
 */
export function formatRelativeTimeBR(date: Date | string | null | undefined): string {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '-';
  
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'agora';
  if (minutes < 60) return `há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  if (hours < 24) return `há ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  if (days < 30) return `há ${Math.floor(days / 7)} ${Math.floor(days / 7) === 1 ? 'semana' : 'semanas'}`;
  if (days < 365) return `há ${Math.floor(days / 30)} ${Math.floor(days / 30) === 1 ? 'mês' : 'meses'}`;
  
  return formatDateBR(d);
}

/**
 * Retorna o nome do mês em português
 */
export function getMonthNameBR(month: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month] || '';
}

/**
 * Retorna o nome do dia da semana em português
 */
export function getDayNameBR(day: number): string {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return days[day] || '';
}

/**
 * Retorna o nome do dia da semana abreviado em português
 */
export function getDayShortNameBR(day: number): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[day] || '';
}
