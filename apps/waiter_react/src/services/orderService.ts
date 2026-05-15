import api from './api';

export const orderService = {
  placeOrder: async (orderData: any) => {
    const response = await api.post('orders', orderData);
    return response.data;
  },
  
  fetchOrders: async () => {
    const response = await api.get('orders');
    return response.data;
  },
  
  updateStatus: async (orderId: number | string, status: string) => {
    const response = await api.patch(`orders/${orderId}`, { status });
    return response.data;
  },
  
  fetchDashboardStats: async () => {
    const response = await api.get('reports/waiter-dashboard');
    return response.data;
  },
  
  fetchSettings: async () => {
    const response = await api.get('settings');
    return response.data;
  }
};

export const menuService = {
  fetchCategories: async () => {
    // Backend returns nested structure in /menu
    const response = await api.get('menu');
    return response.data;
  },
  
  fetchItemsByCategory: async (categoryId: number | string) => {
    const response = await api.get('menu');
    const categories = response.data;
    const category = categories.find((c: any) => c.id === categoryId.toString());
    return category ? category.items : [];
  },

  fetchAllItems: async () => {
    const response = await api.get('menu');
    return response.data; // This returns categories with nested items
  }
};

export const tableService = {
  fetchTables: async () => {
    const response = await api.get('tables');
    return response.data;
  }
};
