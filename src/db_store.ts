/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  User, UserRole, Product, Order, OrderStatus, 
  InventoryItem, InventoryTransaction, Shipment, 
  OrderHistoryEntry, Notification, RawMaterialCatalogItem 
} from './types';

const DB_FILE = path.join(process.cwd(), 'db.json');

export interface DatabaseSchema {
  users: User[];
  products: Product[];
  orders: Order[];
  inventory: InventoryItem[];
  transactions: InventoryTransaction[];
  shipments: Shipment[];
  history: OrderHistoryEntry[];
  notifications: Notification[];
  rawMaterialsCatalog: RawMaterialCatalogItem[];
}

const DEFAULT_RAW_CATALOG: RawMaterialCatalogItem[] = [
  { id: 'cat-1', name: 'ПЭТ Преформы 1.5л (PET Preforms 1.5L)', unit: 'pcs', minThreshold: 3000 },
  { id: 'cat-2', name: 'Крышки пластиковые (Plastic Caps)', unit: 'pcs', minThreshold: 5000 },
  { id: 'cat-3', name: 'Этикетка Coca-Cola 1.5л (Labels Cola 1.5L)', unit: 'pcs', minThreshold: 4000 },
  { id: 'cat-4', name: 'Этикетка Fanta 1.5л (Labels Fanta 1.5L)', unit: 'pcs', minThreshold: 2000 },
  { id: 'cat-5', name: 'Этикетка Sprite 1.5л (Labels Sprite 1.5L)', unit: 'pcs', minThreshold: 2000 },
  { id: 'cat-6', name: 'Двуокись углерода CO2 (Carbon Dioxide CO2)', unit: 'kg', minThreshold: 200 },
  { id: 'cat-7', name: 'Термоусадочная пленка (Shrink Wrap)', unit: 'rolls', minThreshold: 30 }
];

const DEFAULT_USERS: User[] = [
  { id: 'u1', username: 'admin', name: 'Абдуллох Каримов (Admin)', role: 'admin', language: 'ru' },
  { id: 'u2', username: 'manager', name: 'Дилшод Алиев (Manager)', role: 'manager', language: 'ru' },
  { id: 'u3', username: 'production', name: 'Тимур Усманов (Production)', role: 'production', language: 'uz' },
  { id: 'u4', username: 'warehouse', name: 'Сардор Рахимов (Warehouse)', role: 'warehouse', language: 'ru' },
  { id: 'u5', username: 'supervisor', name: 'Шерзод Хасанов (Director)', role: 'supervisor', language: 'ru' },
];

const DEFAULT_PRODUCTS: Product[] = [
  { sku: 'PRD-COL-15', name: 'Coca-Cola 1.5L', description: 'Газированный напиток Кока-Кола 1.5 литра', weight: 1.56, unitsPerPallet: 360, isArchived: false },
  { sku: 'PRD-FAN-15', name: 'Fanta Orange 1.5L', description: 'Газированный напиток Фанта Апельсин 1.5 литра', weight: 1.56, unitsPerPallet: 360, isArchived: false },
  { sku: 'PRD-SPR-15', name: 'Sprite 1.5L', description: 'Газированный напиток Спрайт 1.5 литра', weight: 1.55, unitsPerPallet: 360, isArchived: false },
  { sku: 'PRD-BON-15', name: 'Bonaqua Still 1.5L', description: 'Вода негазированная Бонаква 1.5 литра', weight: 1.52, unitsPerPallet: 384, isArchived: false },
  { sku: 'PRD-FUS-05', name: 'FuseTea Peach 0.5L', description: 'Холодный чай Фьюзти Персик 0.5 литра', weight: 0.53, unitsPerPallet: 720, isArchived: false }
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  // Keles Factory
  { id: 'raw-kel-1', name: 'ПЭТ Преформы 1.5л (PET Preforms 1.5L)', type: 'raw_material', quantity: 12500, minThreshold: 3000, factory: 'Keles', unit: 'pcs' },
  { id: 'raw-kel-2', name: 'Крышки пластиковые (Plastic Caps)', type: 'raw_material', quantity: 24000, minThreshold: 5000, factory: 'Keles', unit: 'pcs' },
  { id: 'raw-kel-3', name: 'Этикетка Coca-Cola 1.5л (Labels Cola 1.5L)', type: 'raw_material', quantity: 18000, minThreshold: 4000, factory: 'Keles', unit: 'pcs' },
  { id: 'raw-kel-4', name: 'Двуокись углерода CO2 (Carbon Dioxide CO2)', type: 'raw_material', quantity: 850, minThreshold: 200, factory: 'Keles', unit: 'kg' },
  { id: 'raw-kel-5', name: 'Термоусадочная пленка (Shrink Wrap)', type: 'raw_material', quantity: 120, minThreshold: 30, factory: 'Keles', unit: 'rolls' },
  
  // Yunusobod Factory
  { id: 'raw-yun-1', name: 'ПЭТ Преформы 1.5л (PET Preforms 1.5L)', type: 'raw_material', quantity: 1800, minThreshold: 3000, factory: 'Yunusobod', unit: 'pcs' }, // Trigger warning
  { id: 'raw-yun-2', name: 'Крышки пластиковые (Plastic Caps)', type: 'raw_material', quantity: 15000, minThreshold: 5000, factory: 'Yunusobod', unit: 'pcs' },
  { id: 'raw-yun-3', name: 'Этикетка Fanta 1.5л (Labels Fanta 1.5L)', type: 'raw_material', quantity: 9500, minThreshold: 2000, factory: 'Yunusobod', unit: 'pcs' },
  { id: 'raw-yun-4', name: 'Этикетка Sprite 1.5л (Labels Sprite 1.5L)', type: 'raw_material', quantity: 1200, minThreshold: 2000, factory: 'Yunusobod', unit: 'pcs' }, // Trigger warning
  { id: 'raw-yun-5', name: 'Двуокись углерода CO2 (Carbon Dioxide CO2)', type: 'raw_material', quantity: 450, minThreshold: 200, factory: 'Yunusobod', unit: 'kg' },
];

// Helper to get date relative to today
const getDateOffset = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  // adjust to GMT+5 for seed relative dates
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const gmt5 = new Date(utc + (3600000 * 5));
  return gmt5.toISOString().split('T')[0];
};

const getGMT5Date = (d: Date = new Date()) => {
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5));
};

const getGMT5ISOString = (d: Date = new Date()) => {
  return getGMT5Date(d).toISOString();
};

const getGMT5DateTimeString = (d: Date = new Date()) => {
  return getGMT5ISOString(d).replace('T', ' ').substring(0, 19);
};

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ord-1',
    orderNumber: 'PO-2026-0001',
    date: getDateOffset(-5),
    productSku: 'PRD-COL-15',
    quantityOrdered: 3600, // exactly 10 pallets
    factory: 'Keles',
    unitsPerPallet: 360,
    comment: 'Срочный заказ для дистрибьютора в Самарканде',
    status: 'Shipped',
    produced: 3600,
    defective: 45,
    packed: 3600,
    shipped: 3600,
    equipment: 'Sidel-1 Blow & Fill',
    shift: 'Смена А (Дневная)',
    productionStart: getDateOffset(-4) + ' 08:30',
    productionEnd: getDateOffset(-4) + ' 16:45',
    operatorComment: 'Произведено без задержек. Линия работала на номинальной скорости.',
    createdAt: getDateOffset(-5) + ' 10:15:00',
    createdBy: 'Дилшод Алиев (Manager)',
    updatedAt: getDateOffset(-3) + ' 11:30:00',
    updatedBy: 'Сардор Рахимов (Warehouse)'
  },
  {
    id: 'ord-2',
    orderNumber: 'PO-2026-0002',
    date: getDateOffset(-3),
    productSku: 'PRD-FAN-15',
    quantityOrdered: 7200, // 20 pallets
    factory: 'Yunusobod',
    unitsPerPallet: 360,
    comment: 'Регулярная поставка склад Ташкент',
    status: 'InProduction',
    produced: 4320, // 12 pallets done
    defective: 82,
    packed: 3960, // 11 pallets packed, 1 in process
    shipped: 1440, // 4 pallets already shipped (partial delivery)
    equipment: 'Krones Modul 2',
    shift: 'Смена Б (Ночная)',
    productionStart: getDateOffset(-2) + ' 20:00',
    operatorComment: 'Небольшой затор на конвейере упаковки в начале смены. Устранено.',
    createdAt: getDateOffset(-3) + ' 14:00:00',
    createdBy: 'Дилшод Алиев (Manager)',
    updatedAt: getDateOffset(-1) + ' 10:45:00',
    updatedBy: 'Тимур Усманов (Production)'
  },
  {
    id: 'ord-3',
    orderNumber: 'PO-2026-0003',
    date: getDateOffset(-2),
    productSku: 'PRD-BON-15',
    quantityOrdered: 1920, // 5 pallets (1920/384 = 5)
    factory: 'Keles',
    unitsPerPallet: 384,
    comment: 'Заказ для Horeca',
    status: 'Completed',
    produced: 1920,
    defective: 12,
    packed: 1920,
    shipped: 0,
    equipment: 'Sidel-2 Still Water',
    shift: 'Смена А (Дневная)',
    productionStart: getDateOffset(-1) + ' 09:00',
    productionEnd: getDateOffset(-1) + ' 13:30',
    operatorComment: 'Все паллеты упакованы и переданы на склад готовой продукции.',
    createdAt: getDateOffset(-2) + ' 11:00:00',
    createdBy: 'Абдуллох Каримов (Admin)',
    updatedAt: getDateOffset(-1) + ' 14:00:00',
    updatedBy: 'Тимур Усманов (Production)'
  },
  {
    id: 'ord-4',
    orderNumber: 'PO-2026-0004',
    date: getDateOffset(-1),
    productSku: 'PRD-SPR-15',
    quantityOrdered: 3600,
    factory: 'Yunusobod',
    unitsPerPallet: 360,
    comment: 'Промо-акция летний сезон',
    status: 'New',
    produced: 0,
    defective: 0,
    packed: 0,
    shipped: 0,
    createdAt: getDateOffset(-1) + ' 16:30:00',
    createdBy: 'Дилшод Алиев (Manager)',
    updatedAt: getDateOffset(-1) + ' 16:30:00',
    updatedBy: 'Дилшод Алиев (Manager)'
  },
  {
    id: 'ord-5',
    orderNumber: 'PO-2026-0005',
    date: getDateOffset(0),
    productSku: 'PRD-FUS-05',
    quantityOrdered: 7200, // 10 pallets of 720
    factory: 'Keles',
    unitsPerPallet: 720,
    comment: 'Пополнение буферного склада',
    status: 'New',
    produced: 0,
    defective: 0,
    packed: 0,
    shipped: 0,
    createdAt: getDateOffset(0) + ' 09:15:00',
    createdBy: 'Дилшод Алиев (Manager)',
    updatedAt: getDateOffset(0) + ' 09:15:00',
    updatedBy: 'Дилшод Алиев (Manager)'
  }
];

const DEFAULT_SHIPMENTS: Shipment[] = [
  {
    id: 'ship-1',
    orderId: 'ord-1',
    orderNumber: 'PO-2026-0001',
    productSku: 'PRD-COL-15',
    date: getDateOffset(-3),
    carNumber: '01 A 777 AA',
    recipient: 'ООО Самарканд Дистрибьюшн',
    waybillNumber: 'TTN-2026-9811',
    quantity: 3600,
    comment: 'Полная отгрузка заказа. Все 10 паллет загружены в рефрижератор.',
    user: 'Сардор Рахимов (Warehouse)'
  },
  {
    id: 'ship-2',
    orderId: 'ord-2',
    orderNumber: 'PO-2026-0002',
    productSku: 'PRD-FAN-15',
    date: getDateOffset(-1),
    carNumber: '10 X 500 YZ',
    recipient: 'Оптовый Склад Сергели',
    waybillNumber: 'TTN-2026-9844',
    quantity: 1440, // 4 pallets
    comment: 'Частичная отгрузка (4 паллеты). Водитель проверил пломбы.',
    user: 'Сардор Рахимов (Warehouse)'
  }
];

const DEFAULT_TRANSACTIONS: InventoryTransaction[] = [
  // Raw Material additions
  {
    id: 'tx-1',
    date: getDateOffset(-10) + 'T09:00:00.000Z',
    type: 'received_raw',
    itemName: 'ПЭТ Преформы 1.5л (PET Preforms 1.5L)',
    quantity: 20000,
    factory: 'Keles',
    user: 'Сардор Рахимов (Warehouse)',
    comment: 'Приход от поставщика PET-Glass Uz'
  },
  {
    id: 'tx-2',
    date: getDateOffset(-10) + 'T10:30:00.000Z',
    type: 'received_raw',
    itemName: 'Крышки пластиковые (Plastic Caps)',
    quantity: 30000,
    factory: 'Keles',
    user: 'Сардор Рахимов (Warehouse)',
    comment: 'Приход от PlastCap LLC'
  },
  // Issue to production for Order 1
  {
    id: 'tx-3',
    date: getDateOffset(-4) + 'T08:00:00.000Z',
    type: 'issued_to_production',
    itemName: 'ПЭТ Преформы 1.5л (PET Preforms 1.5L)',
    quantity: -3645, // includes defectives
    factory: 'Keles',
    user: 'Тимур Усманов (Production)',
    referenceId: 'ord-1',
    comment: 'Списание сырья на заказ PO-2026-0001 (с учетом брака)'
  },
  // Auto Finished Good in for Order 1
  {
    id: 'tx-4',
    date: getDateOffset(-4) + 'T17:00:00.000Z',
    type: 'production_inflow',
    itemName: 'Coca-Cola 1.5L',
    sku: 'PRD-COL-15',
    quantity: 3600,
    factory: 'Keles',
    user: 'Тимур Усманов (Production)',
    referenceId: 'ord-1',
    comment: 'Поступление готовой продукции по заказу PO-2026-0001'
  },
  // Outflow on shipment for Order 1
  {
    id: 'tx-5',
    date: getDateOffset(-3) + 'T11:30:00.000Z',
    type: 'shipment_outflow',
    itemName: 'Coca-Cola 1.5L',
    sku: 'PRD-COL-15',
    quantity: -3600,
    factory: 'Keles',
    user: 'Сардор Рахимов (Warehouse)',
    referenceId: 'ord-1',
    comment: 'Отгрузка по накладной TTN-2026-9811'
  },
  // Production Inflow for Order 2 (Partial)
  {
    id: 'tx-6',
    date: getDateOffset(-1) + 'T10:45:00.000Z',
    type: 'production_inflow',
    itemName: 'Fanta Orange 1.5L',
    sku: 'PRD-FAN-15',
    quantity: 3960,
    factory: 'Yunusobod',
    user: 'Тимур Усманов (Production)',
    referenceId: 'ord-2',
    comment: 'Частичное поступление готовой продукции (11 паллет) PO-2026-0002'
  },
  // Shipment Outflow for Order 2 (Partial)
  {
    id: 'tx-7',
    date: getDateOffset(-1) + 'T15:20:00.000Z',
    type: 'shipment_outflow',
    itemName: 'Fanta Orange 1.5L',
    sku: 'PRD-FAN-15',
    quantity: -1440,
    factory: 'Yunusobod',
    user: 'Сардор Рахимов (Warehouse)',
    referenceId: 'ord-2',
    comment: 'Частичная отгрузка по накладной TTN-2026-9844'
  }
];

const DEFAULT_HISTORY: OrderHistoryEntry[] = [
  {
    id: 'hist-1',
    orderId: 'ord-1',
    orderNumber: 'PO-2026-0001',
    user: 'Дилшод Алиев (Manager)',
    timestamp: getDateOffset(-5) + 'T10:15:00.000Z',
    details: 'Создана новая заявка на Coca-Cola 1.5L в количестве 3600 шт. Завод: Келес.'
  },
  {
    id: 'hist-2',
    orderId: 'ord-1',
    orderNumber: 'PO-2026-0001',
    user: 'Тимур Усманов (Production)',
    timestamp: getDateOffset(-4) + 'T08:30:00.000Z',
    details: 'Статус изменен на "В производстве". Назначено оборудование Sidel-1, Смена А.'
  },
  {
    id: 'hist-3',
    orderId: 'ord-1',
    orderNumber: 'PO-2026-0001',
    user: 'Тимур Усманов (Production)',
    timestamp: getDateOffset(-4) + 'T17:00:00.000Z',
    details: 'Производство завершено. Произведено: 3600 шт, Брак: 45 шт, Упаковано: 3600 шт. Статус изменен на "Завершена". готовая продукция поступила на склад.'
  },
  {
    id: 'hist-4',
    orderId: 'ord-1',
    orderNumber: 'PO-2026-0001',
    user: 'Сардор Рахимов (Warehouse)',
    timestamp: getDateOffset(-3) + 'T11:30:00.000Z',
    details: 'Отгружено 3600 шт получателю ООО Самарканд Дистрибьюшн, машина 01 A 777 AA. Статус изменен на "Отгружена". Списано со склада готовой продукции.'
  }
];

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    timestamp: getDateOffset(-3) + 'T11:30:00.000Z',
    type: 'success',
    messageRu: 'Заявка PO-2026-0001 полностью отгружена получателю ООО Самарканд Дистрибьюшн.',
    messageUz: 'PO-2026-0001 buyurtmasi qabul qiluvchi MCHJ Samarkand Distribution-ga to\'liq yuklab jo\'natildi.',
    read: false
  },
  {
    id: 'notif-2',
    timestamp: getDateOffset(-1) + 'T10:45:00.000Z',
    type: 'info',
    messageRu: 'Запущено производство по заявке PO-2026-0002 на заводе Юнусобод.',
    messageUz: 'Yunusobod zavodida PO-2026-0002 buyurtmasi bo\'yicha ishlab chiqarish boshlandi.',
    read: true
  },
  {
    id: 'notif-3',
    timestamp: getDateOffset(0) + 'T08:00:00.000Z',
    type: 'warning',
    messageRu: 'Низкий остаток сырья: "ПЭТ Преформы 1.5л" на заводе Юнусобод (1800 шт остаток, порог 3000 шт).',
    messageUz: 'Xom-ashyo qoldig\'i kam: Yunusobod zavodida "PET Preformalar 1.5l" (qoldiq 1800 dona, chegara 3000 dona).',
    read: false
  },
  {
    id: 'notif-4',
    timestamp: getDateOffset(0) + 'T08:05:00.000Z',
    type: 'warning',
    messageRu: 'Низкий остаток сырья: "Этикетка Sprite 1.5л" на заводе Юнусобод (1200 шт остаток, порог 2000 шт).',
    messageUz: 'Xom-ashyo qoldig\'i kam: Yunusobod zavodida "Sprite yorlig\'i 1.5l" (qoldiq 1200 dona, chegara 2000 dona).',
    read: false
  }
];

export class DBStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      users: DEFAULT_USERS,
      products: DEFAULT_PRODUCTS,
      orders: DEFAULT_ORDERS,
      inventory: DEFAULT_INVENTORY,
      transactions: DEFAULT_TRANSACTIONS,
      history: DEFAULT_HISTORY,
      notifications: DEFAULT_NOTIFICATIONS,
      shipments: DEFAULT_SHIPMENTS,
      rawMaterialsCatalog: DEFAULT_RAW_CATALOG,
    };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        // Merge with defaults to ensure robust structures
        this.data = {
          users: parsed.users || DEFAULT_USERS,
          products: parsed.products || DEFAULT_PRODUCTS,
          orders: parsed.orders || DEFAULT_ORDERS,
          inventory: parsed.inventory || DEFAULT_INVENTORY,
          transactions: parsed.transactions || DEFAULT_TRANSACTIONS,
          history: parsed.history || DEFAULT_HISTORY,
          notifications: parsed.notifications || DEFAULT_NOTIFICATIONS,
          shipments: parsed.shipments || DEFAULT_SHIPMENTS,
          rawMaterialsCatalog: parsed.rawMaterialsCatalog || DEFAULT_RAW_CATALOG,
        };
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Failed to load database, using defaults:', err);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write database:', err);
    }
  }

  // Auth Operations
  getUsers(): User[] {
    return this.data.users;
  }

  updateUserLanguage(userId: string, language: 'ru' | 'uz'): User | null {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.language = language;
      this.save();
      return user;
    }
    return null;
  }

  addUser(user: Omit<User, 'id'>): User {
    const id = 'u-' + Math.random().toString(36).substr(2, 9);
    const newUser: User = { id, ...user };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateUser(id: string, updatedFields: Partial<Omit<User, 'id'>>): User | null {
    const user = this.data.users.find(u => u.id === id);
    if (user) {
      Object.assign(user, updatedFields);
      this.save();
      return user;
    }
    return null;
  }

  deleteUser(id: string): boolean {
    const initialLength = this.data.users.length;
    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  // Product Operations
  getProducts(): Product[] {
    return this.data.products;
  }

  addProduct(product: Product): Product {
    // Prevent duplicate SKU
    const existing = this.data.products.find(p => p.sku === product.sku);
    if (existing) {
      throw new Error(`Продукт с SKU ${product.sku} уже существует.`);
    }
    this.data.products.push(product);
    this.save();
    return product;
  }

  updateProduct(sku: string, updated: Partial<Product>): Product {
    const idx = this.data.products.findIndex(p => p.sku === sku);
    if (idx === -1) throw new Error(`Продукт с SKU ${sku} не найден.`);
    this.data.products[idx] = { ...this.data.products[idx], ...updated };
    this.save();
    return this.data.products[idx];
  }

  deleteProduct(sku: string): boolean {
    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter(p => p.sku !== sku);
    if (this.data.products.length < initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Order Operations
  getOrders(): Order[] {
    return this.data.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.data.orders.find(o => o.id === id);
  }

  addOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'produced' | 'defective' | 'packed' | 'shipped'>, user: string): Order {
    const id = 'ord-' + Math.random().toString(36).substring(2, 9);
    const nowStr = getGMT5DateTimeString();
    
    const newOrder: Order = {
      ...order,
      id,
      produced: 0,
      defective: 0,
      packed: 0,
      shipped: 0,
      createdAt: nowStr,
      createdBy: user,
      updatedAt: nowStr,
      updatedBy: user,
    };

    this.data.orders.push(newOrder);
    
    // Add history entry
    this.addHistoryEntry(id, newOrder.orderNumber, user, 
      `Создан новый заказ ${newOrder.orderNumber}. Продукт SKU: ${newOrder.productSku}, Кол-во: ${newOrder.quantityOrdered}. Завод: ${newOrder.factory}.`
    );

    // Notification for new order
    this.addNotification('info', 
      `Создана новая заявка ${newOrder.orderNumber} на завод ${newOrder.factory === 'Keles' ? 'Келес' : 'Юнусобод'}.`,
      `${newOrder.factory === 'Keles' ? 'Keles' : 'Yunusobod'} zavodida yangi ${newOrder.orderNumber} buyurtmasi yaratildi.`
    );

    this.save();
    return newOrder;
  }

  updateOrder(id: string, updates: Partial<Order>, user: string): Order {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx === -1) throw new Error(`Заявка с ID ${id} не найдена.`);
    
    const original = this.data.orders[idx];
    const nowStr = getGMT5DateTimeString();

    // Track what changes for history log
    const changes: string[] = [];
    if (updates.status && updates.status !== original.status) {
      changes.push(`Статус изменен с "${original.status}" на "${updates.status}"`);
    }
    if (updates.produced !== undefined && updates.produced !== original.produced) {
      changes.push(`Произведено изменено с ${original.produced} на ${updates.produced}`);
    }
    if (updates.packed !== undefined && updates.packed !== original.packed) {
      changes.push(`Упаковано изменено с ${original.packed} на ${updates.packed}`);
    }
    if (updates.defective !== undefined && updates.defective !== original.defective) {
      changes.push(`Брак изменен с ${original.defective} на ${updates.defective}`);
    }
    
    const updatedOrder: Order = {
      ...original,
      ...updates,
      updatedAt: nowStr,
      updatedBy: user
    };

    // Adjust raw materials inventory based on usedRawMaterials changes
    if (updates.usedRawMaterials !== undefined) {
      const origMap = new Map(original.usedRawMaterials?.map(rm => [rm.id, rm.quantity]) || []);
      const newMap = new Map(updates.usedRawMaterials?.map(rm => [rm.id, rm.quantity]) || []);
      const allIds = new Set([...origMap.keys(), ...newMap.keys()]);

      for (const rmId of allIds) {
        const origQty = origMap.get(rmId) || 0;
        const newQty = newMap.get(rmId) || 0;
        const diff = newQty - origQty; // positive means more was used

        if (diff !== 0) {
          const item = this.data.inventory.find(i => i.id === rmId);
          if (item) {
            item.quantity -= diff; // subtract the increase in used quantity

            // Log Transaction
            const tx: InventoryTransaction = {
              id: 'tx-' + Math.random().toString(36).substring(2, 9),
              date: getGMT5ISOString(),
              type: 'issued_to_production',
              itemName: item.name,
              quantity: -diff,
              factory: original.factory,
              user,
              referenceId: id,
              comment: `Списание сырья под заказ ${original.orderNumber} (изменение: ${origQty} -> ${newQty})`
            };
            this.data.transactions.push(tx);

            // Alert if below threshold
            if (item.minThreshold !== undefined && item.quantity < item.minThreshold) {
              this.addNotification('warning',
                `Низкий остаток сырья: "${item.name}" на заводе ${item.factory === 'Keles' ? 'Келес' : 'Юнусобод'} (${item.quantity} ${item.unit} остаток, порог ${item.minThreshold} ${item.unit}).`,
                `Xom-ashyo qoldig'i kam: ${item.factory === 'Keles' ? 'Keles' : 'Yunusobod'} zavodida "${item.name}" (qoldiq ${item.quantity} ${item.unit}, chegara ${item.minThreshold} ${item.unit}).`
              );
            }
          }
        }
      }
    }

    this.data.orders[idx] = updatedOrder;

    if (changes.length > 0) {
      this.addHistoryEntry(id, updatedOrder.orderNumber, user, changes.join('; '));
    }

    // Check for production completion notification
    if (updates.status === 'Completed' && original.status !== 'Completed') {
      this.addNotification('success', 
        `Производство по заказу ${updatedOrder.orderNumber} завершено! Произведено ${updatedOrder.produced} шт.`,
        `${updatedOrder.orderNumber} buyurtmasi bo'yicha ishlab chiqarish yakunlandi! ${updatedOrder.produced} dona ishlab chiqarildi.`
      );

      // Automatic finished goods inventory increase when completed/packed
      const prod = this.data.products.find(p => p.sku === updatedOrder.productSku);
      const prodName = prod ? prod.name : updatedOrder.productSku;
      this.adjustInventory(prodName, 'finished_good', updatedOrder.packed, updatedOrder.factory, user, id, `Поступление ГП после завершения заказа ${updatedOrder.orderNumber}`, updatedOrder.productSku);
    }

    this.save();
    return updatedOrder;
  }

  deleteOrder(id: string): boolean {
    const idx = this.data.orders.findIndex(o => o.id === id);
    if (idx === -1) return false;
    this.data.orders.splice(idx, 1);
    this.save();
    return true;
  }

  // Shipments Operations
  getShipments(): Shipment[] {
    return this.data.shipments;
  }

  addShipment(shipmentData: Omit<Shipment, 'id'>, user: string): Shipment {
    const id = 'ship-' + Math.random().toString(36).substring(2, 9);
    const shipment: Shipment = {
      ...shipmentData,
      id,
      user
    };

    // Update order shipped count
    const order = this.getOrderById(shipment.orderId);
    if (!order) throw new Error('Заказ не найден');

    const product = this.getProducts().find(p => p.sku === shipment.productSku);
    const productName = product ? product.name : shipment.productSku;

    const newShipped = order.shipped + shipment.quantity;
    if (newShipped > order.packed) {
      throw new Error(`Превышено количество упакованной продукции. Упаковано: ${order.packed}, Уже отгружено: ${order.shipped}, Попытка отгрузить: ${shipment.quantity}`);
    }

    // Save shipment
    this.data.shipments.push(shipment);

    // Update order shipped quantity
    const statusUpdate: Partial<Order> = { shipped: newShipped };
    if (newShipped >= order.quantityOrdered) {
      statusUpdate.status = 'Shipped';
    }
    this.updateOrder(order.id, statusUpdate, user);

    // Deduct finished goods from warehouse
    this.adjustInventory(productName, 'finished_good', -shipment.quantity, order.factory, user, order.id, `Отгрузка по накладной ${shipment.waybillNumber}`, shipment.productSku);

    // Notification for full shipment
    if (newShipped >= order.quantityOrdered) {
      this.addNotification('success', 
        `Заказ ${order.orderNumber} полностью отгружен получателю ${shipment.recipient} (Всего: ${newShipped} шт).`,
        `${order.orderNumber} buyurtmasi qabul qiluvchi ${shipment.recipient}-ga to'liq jo'natildi (Jami: ${newShipped} dona).`
      );
    }

    this.save();
    return shipment;
  }

  // Warehouse Inventory Operations
  getInventory(): InventoryItem[] {
    return this.data.inventory;
  }

  getTransactions(): InventoryTransaction[] {
    return this.data.transactions;
  }

  adjustInventory(
    itemName: string, 
    type: 'raw_material' | 'finished_good', 
    qtyChange: number, 
    factory: 'Keles' | 'Yunusobod', 
    user: string,
    refId?: string,
    comment?: string,
    sku?: string
  ) {
    // Find or create item
    let item = this.data.inventory.find(i => i.name === itemName && i.factory === factory && i.type === type);
    
    if (!item) {
      const id = 'inv-' + Math.random().toString(36).substring(2, 9);
      item = {
        id,
        name: itemName,
        type,
        sku,
        quantity: 0,
        factory,
        unit: type === 'finished_good' ? 'pcs' : 'pcs' // default unit
      };
      this.data.inventory.push(item);
    }

    item.quantity += qtyChange;
    if (item.quantity < 0) {
      // Allow negatives if raw materials but log it
      console.warn(`Warning: inventory quantity for ${itemName} at ${factory} is negative: ${item.quantity}`);
    }

    // Add Transaction
    let txType: InventoryTransaction['type'] = 'manual_adjustment';
    if (type === 'raw_material') {
      txType = qtyChange > 0 ? 'received_raw' : 'issued_to_production';
    } else {
      txType = qtyChange > 0 ? 'production_inflow' : 'shipment_outflow';
    }

    const tx: InventoryTransaction = {
      id: 'tx-' + Math.random().toString(36).substring(2, 9),
      date: getGMT5ISOString(),
      type: txType,
      itemName,
      sku,
      quantity: qtyChange,
      factory,
      user,
      referenceId: refId,
      comment
    };

    this.data.transactions.push(tx);

    // Check low stock threshold for raw materials
    if (type === 'raw_material' && item.minThreshold !== undefined && item.quantity < item.minThreshold) {
      this.addNotification('warning',
        `Низкий остаток сырья: "${itemName}" на заводе ${factory === 'Keles' ? 'Келес' : 'Юнусобод'} (${item.quantity} ${item.unit} остаток, порог ${item.minThreshold} ${item.unit}).`,
        `Xom-ashyo qoldig'i kam: ${factory === 'Keles' ? 'Keles' : 'Yunusobod'} zavodida "${itemName}" (qoldiq ${item.quantity} ${item.unit}, chegara ${item.minThreshold} ${item.unit}).`
      );
    }

    this.save();
  }

  updateInventoryItem(id: string, updates: { quantity?: number; minThreshold?: number }, user: string): InventoryItem {
    const idx = this.data.inventory.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Элемент инвентаря с ID ${id} не найден.`);

    const original = this.data.inventory[idx];
    
    // Log transaction if quantity changed
    if (updates.quantity !== undefined && updates.quantity !== original.quantity) {
      const qtyChange = updates.quantity - original.quantity;
      let txType: InventoryTransaction['type'] = 'manual_adjustment';
      if (original.type === 'raw_material') {
        txType = qtyChange > 0 ? 'received_raw' : 'issued_to_production';
      } else {
        txType = qtyChange > 0 ? 'production_inflow' : 'shipment_outflow';
      }
      const tx: InventoryTransaction = {
        id: 'tx-' + Math.random().toString(36).substring(2, 9),
        date: getGMT5ISOString(),
        type: txType,
        itemName: original.name,
        sku: original.sku,
        quantity: qtyChange,
        factory: original.factory,
        user,
        comment: `Ручное изменение остатка: ${original.quantity} -> ${updates.quantity}`
      };
      this.data.transactions.push(tx);
    }

    const updated: InventoryItem = {
      ...original,
      ...updates
    };

    this.data.inventory[idx] = updated;

    // Check low stock threshold for raw materials
    if (updated.type === 'raw_material' && updated.minThreshold !== undefined && updated.quantity < updated.minThreshold) {
      this.addNotification('warning',
        `Низкий остаток сырья: "${updated.name}" на заводе ${updated.factory === 'Keles' ? 'Келес' : 'Юнусобод'} (${updated.quantity} ${updated.unit} остаток, порог ${updated.minThreshold} ${updated.unit}).`,
        `Xom-ashyo qoldig'i kam: ${updated.factory === 'Keles' ? 'Keles' : 'Yunusobod'} zavodida "${updated.name}" (qoldiq ${updated.quantity} ${updated.unit}, chegara ${updated.minThreshold} ${updated.unit}).`
      );
    }

    this.save();
    return updated;
  }

  addHistoryEntry(orderId: string, orderNumber: string, user: string, details: string) {
    const entry: OrderHistoryEntry = {
      id: 'hist-' + Math.random().toString(36).substring(2, 9),
      orderId,
      orderNumber,
      user,
      timestamp: getGMT5ISOString(),
      details
    };
    this.data.history.push(entry);
  }

  getHistoryByOrderId(orderId: string): OrderHistoryEntry[] {
    return this.data.history
      .filter(h => h.orderId === orderId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  getHistory(): OrderHistoryEntry[] {
    return this.data.history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Notifications
  getNotifications(): Notification[] {
    return this.data.notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  addNotification(type: Notification['type'], msgRu: string, msgUz: string) {
    const notif: Notification = {
      id: 'notif-' + Math.random().toString(36).substring(2, 9),
      timestamp: getGMT5ISOString(),
      type,
      messageRu: msgRu,
      messageUz: msgUz,
      read: false
    };
    this.data.notifications.push(notif);
  }

  markAllNotificationsRead() {
    this.data.notifications.forEach(n => n.read = true);
    this.save();
  }

  clearNotifications() {
    this.data.notifications = [];
    this.save();
  }

  // Raw Materials Catalog
  getRawMaterialsCatalog(): RawMaterialCatalogItem[] {
    return this.data.rawMaterialsCatalog || [];
  }

  addRawMaterialCatalogItem(name: string, unit: string, minThreshold?: number): RawMaterialCatalogItem {
    if (!this.data.rawMaterialsCatalog) {
      this.data.rawMaterialsCatalog = [];
    }
    const id = 'cat-' + Math.random().toString(36).substring(2, 9);
    const item: RawMaterialCatalogItem = {
      id,
      name,
      unit,
      minThreshold
    };
    this.data.rawMaterialsCatalog.push(item);
    this.save();
    return item;
  }

  deleteRawMaterialCatalogItem(id: string): boolean {
    if (!this.data.rawMaterialsCatalog) return false;
    const initialLen = this.data.rawMaterialsCatalog.length;
    this.data.rawMaterialsCatalog = this.data.rawMaterialsCatalog.filter(item => item.id !== id);
    if (this.data.rawMaterialsCatalog.length < initialLen) {
      this.save();
      return true;
    }
    return false;
  }
}
