/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { DBStore } from './src/db_store';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const db = new DBStore();

  app.use(express.json());

  // --- API Routes ---

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    const users = db.getUsers();
    
    // Very simple password check (default is '123' for testing all accounts)
    const user = users.find(u => u.username === username);
    if (user && password === '123') {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Неверное имя пользователя или пароль (используйте пароль 123)' });
    }
  });

  // Clear all data
  app.post('/api/clear-all', (req, res) => {
    try {
      db.clearAllData();
      res.json({ success: true, message: 'Все заказы, склад и товары успешно очищены' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Auth: Update language
  app.put('/api/auth/language', (req, res) => {
    const { userId, language } = req.body;
    if (!userId || !language || (language !== 'ru' && language !== 'uz')) {
      return res.status(400).json({ success: false, message: 'Invalid data' });
    }
    const user = db.updateUserLanguage(userId, language);
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  });

  // Users / Employees Management API
  app.get('/api/users', (req, res) => {
    res.json(db.getUsers());
  });

  app.post('/api/users', (req, res) => {
    try {
      const { username, name, role, language } = req.body;
      if (!username || !name || !role) {
        return res.status(400).json({ success: false, message: 'Username, name, and role are required' });
      }

      // Check if username already exists
      const existing = db.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existing) {
        return res.status(400).json({ success: false, message: 'Пользователь с таким логином уже существует / Login band' });
      }

      const newUser = db.addUser({
        username,
        name,
        role,
        language: language || 'ru'
      });
      res.json({ success: true, user: newUser });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.put('/api/users/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { username, name, role, language } = req.body;
      
      // Check if username already taken by another user
      if (username) {
        const existing = db.getUsers().find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== id);
        if (existing) {
          return res.status(400).json({ success: false, message: 'Логин уже занят / Login band' });
        }
      }

      const updated = db.updateUser(id, { username, name, role, language });
      if (updated) {
        res.json({ success: true, user: updated });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.delete('/api/users/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = db.deleteUser(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: 'User not found' });
      }
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Products
  app.get('/api/products', (req, res) => {
    res.json(db.getProducts());
  });

  app.post('/api/products', (req, res) => {
    try {
      const { sku, name, description, weight, unitsPerPallet, specification, photos } = req.body;
      const product = db.addProduct({
        sku,
        name,
        description,
        weight: Number(weight),
        unitsPerPallet: Number(unitsPerPallet),
        isArchived: false,
        specification,
        photos,
      });
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.put('/api/products/:sku', (req, res) => {
    try {
      const { sku } = req.params;
      const product = db.updateProduct(sku, req.body);
      res.json({ success: true, product });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.delete('/api/products/:sku', (req, res) => {
    try {
      const { sku } = req.params;
      const deleted = db.deleteProduct(sku);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: 'Product not found' });
      }
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Orders
  app.get('/api/orders', (req, res) => {
    res.json(db.getOrders());
  });

  app.get('/api/orders/:id', (req, res) => {
    const order = db.getOrderById(req.params.id);
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  });

  app.post('/api/orders', (req, res) => {
    try {
      const { user, order } = req.body;
      if (!user) return res.status(400).json({ message: 'User is required for tracking changes' });
      const newOrder = db.addOrder(order, user);
      res.json({ success: true, order: newOrder });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.put('/api/orders/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { user, updates } = req.body;
      if (!user) return res.status(400).json({ message: 'User is required for tracking changes' });
      const updatedOrder = db.updateOrder(id, updates, user);
      res.json({ success: true, order: updatedOrder });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.delete('/api/orders/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = db.deleteOrder(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: 'Order not found' });
      }
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Shipments
  app.get('/api/shipments', (req, res) => {
    res.json(db.getShipments());
  });

  app.post('/api/shipments', (req, res) => {
    try {
      const { user, shipment } = req.body;
      if (!user) return res.status(400).json({ message: 'User is required' });
      const newShipment = db.addShipment(shipment, user);
      res.json({ success: true, shipment: newShipment });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Warehouse Inventory
  app.get('/api/inventory', (req, res) => {
    res.json(db.getInventory());
  });

  app.get('/api/inventory/transactions', (req, res) => {
    res.json(db.getTransactions());
  });

  app.post('/api/inventory/adjust', (req, res) => {
    try {
      const { user, itemName, type, qtyChange, factory, comment, sku } = req.body;
      if (!user) return res.status(400).json({ message: 'User is required' });
      db.adjustInventory(itemName, type, Number(qtyChange), factory, user, undefined, comment, sku);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.put('/api/inventory/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { user, updates } = req.body;
      if (!user) return res.status(400).json({ message: 'User is required' });
      const updatedItem = db.updateInventoryItem(id, updates, user);
      res.json({ success: true, item: updatedItem });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.delete('/api/inventory/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = db.deleteInventoryItem(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: 'Inventory item not found' });
      }
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Raw Materials Catalog Endpoints
  app.get('/api/raw-materials', (req, res) => {
    res.json(db.getRawMaterialsCatalog());
  });

  app.post('/api/raw-materials', (req, res) => {
    try {
      const { name, unit, minThreshold } = req.body;
      if (!name || !unit) {
        return res.status(400).json({ success: false, message: 'Name and unit are required' });
      }
      const newItem = db.addRawMaterialCatalogItem(name, unit, minThreshold ? Number(minThreshold) : undefined);
      res.json({ success: true, item: newItem });
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  app.delete('/api/raw-materials/:id', (req, res) => {
    try {
      const { id } = req.params;
      const deleted = db.deleteRawMaterialCatalogItem(id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ success: false, message: 'Item not found' });
      }
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Change History
  app.get('/api/history', (req, res) => {
    res.json(db.getHistory());
  });

  app.get('/api/history/:orderId', (req, res) => {
    res.json(db.getHistoryByOrderId(req.params.orderId));
  });

  // Notifications
  app.get('/api/notifications', (req, res) => {
    res.json(db.getNotifications());
  });

  app.post('/api/notifications/read-all', (req, res) => {
    db.markAllNotificationsRead();
    res.json({ success: true });
  });

  app.post('/api/notifications/clear', (req, res) => {
    db.clearNotifications();
    res.json({ success: true });
  });

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
