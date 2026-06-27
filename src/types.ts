/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'manager' | 'production' | 'warehouse' | 'supervisor';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  language: 'ru' | 'uz';
}

export interface Product {
  sku: string; // SKU code
  name: string;
  description: string;
  weight: number; // unit weight in kg
  unitsPerPallet: number;
  isArchived: boolean;
  specification?: {
    name: string;
    size: number;
    base64: string;
    uploadedAt: string;
  };
  photos?: string[]; // array of base64 image strings
}

export type OrderStatus = 'New' | 'InProduction' | 'Completed' | 'Shipped' | 'Closed';

export interface Order {
  id: string;
  orderNumber: string;
  date: string; // YYYY-MM-DD
  productSku: string;
  quantityOrdered: number;
  factory: 'Keles' | 'Yunusobod';
  unitsPerPallet: number;
  comment: string;
  status: OrderStatus;
  
  // Production stats
  produced: number;
  defective: number;
  packed: number;
  shipped: number;
  
  // Production operational details
  equipment?: string;
  shift?: string;
  productionStart?: string; // YYYY-MM-DD HH:MM
  productionEnd?: string; // YYYY-MM-DD HH:MM
  operatorComment?: string;
  usedRawMaterials?: { id: string; name: string; quantity: number; unit: string }[];
  
  // Audit info
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'raw_material' | 'finished_good';
  sku?: string; // for finished goods, references product sku
  quantity: number;
  minThreshold?: number; // low-stock trigger limit (only for raw materials)
  factory: 'Keles' | 'Yunusobod';
  unit: string; // kg, pcs, rolls, etc.
}

export interface InventoryTransaction {
  id: string;
  date: string; // ISO String
  type: 'received_raw' | 'issued_to_production' | 'production_inflow' | 'shipment_outflow' | 'manual_adjustment';
  itemName: string;
  sku?: string;
  quantity: number; // positive or negative
  factory: 'Keles' | 'Yunusobod';
  user: string;
  referenceId?: string; // references orderId or shipmentId
  comment?: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  productSku: string;
  date: string; // YYYY-MM-DD
  carNumber: string;
  recipient: string;
  waybillNumber: string;
  quantity: number;
  comment: string;
  user: string;
}

export interface OrderHistoryEntry {
  id: string;
  orderId: string;
  orderNumber: string;
  user: string;
  timestamp: string; // ISO String
  details: string; // Description of changes
}

export interface Notification {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  messageRu: string;
  messageUz: string;
  read: boolean;
}

export interface RawMaterialCatalogItem {
  id: string;
  name: string;
  unit: string;
  minThreshold?: number;
}
