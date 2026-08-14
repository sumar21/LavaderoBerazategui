
import { StockItem, LatestIncome, Provider, Article, Injection } from '@/types';

// Catalogo maestro de productos (Ahora Articulos Completos)
export const ARTICLES_DB: Article[] = [
  { id: 219, providerIds: ['P002'], name: 'AC BOLSILLO', category: 'BOLSILLO', code: '4-E002-AC-0001', unitPrice: 40.00 },
  { id: 220, providerIds: ['P002'], name: 'AC CAM CHI FENES', category: 'CAM CHI FENES', code: '4-C008-AC-0002', unitPrice: 2.00 },
  { id: 221, providerIds: ['P002'], name: 'AC CAM GDE FENES', category: 'CAM GDE FENES', code: '2-C029-AC-0003', unitPrice: 50.00 },
  { id: 222, providerIds: ['P002'], name: 'AC CAM PACIENTE', category: 'CAM PACIENTE', code: '2-C009-AC-0004', unitPrice: 510.00 },
  { id: 223, providerIds: ['P001'], name: 'AC CAMILLERO BCO', category: 'CAMILLERO BCO', code: '4-C031-AC-0005', unitPrice: 2.00 },
  { id: 224, providerIds: ['P001', 'P003'], name: 'AC CAMILLERO ESPECIAL', category: 'CAMILLERO ESPECIAL', code: '4-C031-AC-0006', unitPrice: 450.00 },
  { id: 225, providerIds: ['P003'], name: 'AC CAMILLERO VERDE', category: 'CAMILLERO VERDE', code: '4-C031-AC-0007', unitPrice: 400.00 },
  { id: 226, providerIds: ['P002'], name: 'AC CAMP FENESTRADO', category: 'CAMP FENESTRADO', code: 'F-C001-AC-0009', unitPrice: 120.00 },
  { id: 227, providerIds: ['P002'], name: 'AC CHAQ CELESTE', category: 'CHAQ CELESTE', code: 'F-C001-AC-0010', unitPrice: 850.00 },
];

// Compatibilidad para selects viejos (Mapeo rápido)
export const PRODUCT_CATALOG = ARTICLES_DB.map(a => ({
    sku: a.code,
    description: a.name
}));

export const INITIAL_STOCK: StockItem[] = [
  { id: '1', sku: '4-F001-SF-0437', description: 'SF. FUNDA', subdeposit: 'DEPOSITO', quantity: 411 },
  { id: '2', sku: 'C-C007-SF-0414', description: 'SF. CAMISOLIN', subdeposit: 'DEPOSITO', quantity: 253 },
  { id: '3', sku: 'T-T002-SF-0462', description: 'SF. TOALLONES', subdeposit: 'DEPOSITO', quantity: 84 },
  { id: '4', sku: '1-C005-SF-0435', description: 'SF. CUBRECAMA', subdeposit: 'DEPOSITO', quantity: 135 },
  { id: '5', sku: '1-S001-SF-0459', description: 'SF. SABANA PLANA', subdeposit: 'DEPOSITO', quantity: 292 },
  { id: '6', sku: 'C-C007-L-0145', description: 'L. CAMISOLIN CELESTE', subdeposit: 'DEPOSITO', quantity: 660 },
  { id: '7', sku: '1-S001-L-0172', description: 'L. SABANA PLANA', subdeposit: 'DEPOSITO', quantity: 420 },
  { id: '8', sku: '1-S002-SF-0454', description: 'SF. SABANA AJUSTABLE', subdeposit: 'DEPOSITO', quantity: 328 },
  { id: '9', sku: '1-C005-CEM-0072', description: 'CMLC CUBRECAMA', subdeposit: 'LOGISTICA', quantity: 5 },
  { id: '10', sku: '4-F001-CEM-0074', description: 'CMLC FUNDAS', subdeposit: 'DEPOSITO', quantity: 100 },
  { id: '11', sku: '4-F001-OCL-0102', description: 'OCL FUNDA', subdeposit: 'LOGISTICA', quantity: 32 },
  { id: '12', sku: 'C-C007-OCL-0193', description: 'OCL CAMISOLIN PACIENTE', subdeposit: 'DEPOSITO', quantity: 40 },
  { id: '13', sku: '1-C005-OCL-0198', description: 'OCL CUBRECAMA', subdeposit: 'DEPOSITO', quantity: 11 },
];

export const LATEST_INCOMES: LatestIncome[] = [
  { id: 411, sku: '4-F001-SF-0437', description: 'SF. FUNDA', location: 'DEPOSITO' },
  { id: 185, sku: 'C-C007-L-0145', description: 'L. CAMISOLIN CELESTE', location: 'DEPOSITO' },
  { id: 212, sku: '1-C005-L-0114', description: 'L. CUBRECAMA', location: 'DEPOSITO' },
  { id: 59, sku: '1-S002-SF-0454', description: 'SF. SABANA AJUSTABLE', location: 'DEPOSITO' },
  { id: 253, sku: 'C-C007-SF-0414', description: 'SF. CAMISOLIN', location: 'DEPOSITO' },
  { id: 84, sku: 'T-T002-SF-0462', description: 'SF. TOALLONES', location: 'DEPOSITO' },
  { id: 135, sku: '1-C005-SF-0435', description: 'SF. CUBRECAMA', location: 'DEPOSITO' },
  { id: 293, sku: '1-S001-SF-0459', description: 'SF. SABANA PLANA', location: 'DEPOSITO' },
];

export const RECENT_INJECTIONS: Injection[] = [
  { id: 4021, timestamp: '2024-03-10T09:30:00', client: 'Clinica Modelo', sku: '1-S001-SF-0459', description: 'SF. SABANA PLANA', subdeposit: 'DEPOSITO', origin: 'Lavado Normal', quantity: 150, status: 'PENDIENTE' },
  { id: 4022, timestamp: '2024-03-10T10:15:00', client: 'Hospital Italiano', sku: 'C-C007-SF-0414', description: 'SF. CAMISOLIN', subdeposit: 'DEPOSITO', origin: 'Reparación', quantity: 45, status: 'PENDIENTE' },
  { id: 4023, timestamp: '2024-03-10T11:00:00', client: 'Sanatorio Oeste', sku: '4-F001-OCL-0102', description: 'OCL FUNDA', subdeposit: 'LOGISTICA', origin: 'Devolución', quantity: 300, status: 'PENDIENTE' },
  { id: 4024, timestamp: '2024-03-10T11:45:00', client: 'Clinica Modelo', sku: 'T-T002-SF-0462', description: 'SF. TOALLONES', subdeposit: 'DEPOSITO', origin: 'Lavado Especial', quantity: 80, status: 'PENDIENTE' },
];

export const PROVIDERS: Provider[] = [
  { 
    id: 'P001', 
    name: 'LEO/LUAN', 
    email: '-', 
    phone: '-',
    segment: 'T. Producto terminado',
    paymentCondition: 'ARS',
    currency: 'ARS'
  },
  { 
    id: 'P002', 
    name: 'TRADINGTEXT S.A', 
    email: 'tejidosdelsur2014@gmail.com', 
    phone: '-',
    segment: 'Tejidos del Sur',
    paymentCondition: 'ARS',
    currency: 'ARS' 
  },
  { 
    id: 'P003', 
    name: 'GREENCUP', 
    email: 'administracion@greencup.com.ar', 
    phone: '+5491140057544',
    segment: 'T. Producto terminado',
    paymentCondition: 'ARS',
    currency: 'ARS'
  },
  { 
    id: 'P004', 
    name: 'WINTEX SA / SAHADIE', 
    email: 'agalii@sahadieycia.com.ar', 
    phone: '+5493515188529',
    segment: 'T. Producto terminado',
    paymentCondition: 'ARS',
    currency: 'ARS'
  },
  { 
    id: 'P005', 
    name: 'RUBEN', 
    email: '-', 
    phone: '-',
    segment: 'Cortadores',
    paymentCondition: 'ARS',
    currency: 'ARS'
  },
  { 
    id: 'P006', 
    name: 'ANGEL', 
    email: '-', 
    phone: '-',
    segment: 'Cortadores',
    paymentCondition: 'ARS',
    currency: 'ARS'
  },
  { 
    id: 'P007', 
    name: 'CLARA', 
    email: '-', 
    phone: '-',
    segment: 'Costureras',
    paymentCondition: 'ARS',
    currency: 'ARS'
  }
];
