import { z } from 'zod';

// CPF Validation
export const validateCPF = (cpf: string): boolean => {
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  
  // Check for known invalid CPFs
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;
  
  return true;
};

// Format CPF: 000.000.000-00
export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

// Format matricula: 000.000.00 (8 digits with dots)
export const formatMatricula = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2');
};

// Get raw matricula numbers (exactly 8 digits)
export const getMatriculaNumbers = (value: string): string => {
  return value.replace(/\D/g, '').slice(0, 8);
};

// Validate matricula - must be exactly 8 digits when provided
export const validateMatricula = (value: string): { valid: boolean; message?: string } => {
  if (!value) return { valid: true }; // Optional field
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 0) return { valid: true }; // Empty is valid
  if (numbers.length !== 8) {
    return { valid: false, message: 'Matrícula deve ter 8 dígitos' };
  }
  return { valid: true };
};

// Format birth date: DD-MM-YYYY
export const formatBirthDate = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers
    .replace(/(\d{2})(\d)/, '$1-$2')
    .replace(/(\d{2})(\d)/, '$1-$2');
};

// Parse birth date from DD-MM-YYYY to Date
export const parseBirthDate = (value: string): Date | null => {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const year = parseInt(match[3], 10);
  
  const date = new Date(year, month, day);
  
  // Validate the date is real
  if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
    return null;
  }
  
  return date;
};

// Calculate age from birth date
export const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Format phone: (00) 00000-0000
export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

// Validate Brazilian phone number (must have 11 digits: DDD + 9 + 8 digits)
export const validatePhone = (phone: string): { valid: boolean; message?: string } => {
  const numbers = phone.replace(/\D/g, '');
  
  if (!numbers) return { valid: true }; // Empty is valid (optional field)
  
  if (numbers.length < 10) {
    return { valid: false, message: 'Telefone incompleto' };
  }
  
  if (numbers.length > 11) {
    return { valid: false, message: 'Telefone com muitos dígitos' };
  }
  
  // DDD must be valid (11-99)
  const ddd = parseInt(numbers.substring(0, 2));
  if (ddd < 11 || ddd > 99) {
    return { valid: false, message: 'DDD inválido' };
  }
  
  // Cell phones must start with 9
  if (numbers.length === 11 && numbers[2] !== '9') {
    return { valid: false, message: 'Celular deve começar com 9' };
  }
  
  return { valid: true };
};

// Agent registration schema
export const agentRegistrationSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .refine((val) => !/\d/.test(val), 'Nome não pode conter números')
    .transform((val) => val.toUpperCase().trim()),
  cpf: z.string()
    .min(14, 'CPF inválido')
    .refine((val) => validateCPF(val), 'CPF inválido'),
  matricula: z.string()
    .refine((val) => val.replace(/\D/g, '').length === 8, 'Matrícula deve ter 8 dígitos'),
  unit_id: z.string()
    .min(1, 'Selecione uma unidade'),
  team: z.string()
    .min(1, 'Selecione uma equipe'),
  birth_date: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return parseBirthDate(val) !== null;
    }, 'Data de nascimento inválida'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().max(255, 'Endereço muito longo').optional(),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export type AgentRegistrationData = z.infer<typeof agentRegistrationSchema>;
