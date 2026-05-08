import api from './api';

export const orderService = {
  placeOrder: async (orderData: any) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },
  
  fetchOrders: async () => {
    const response = await api.get('/orders');
    return response.data;
  },
  
  updateStatus: async (orderId: number | string, status: string) => {
    const response = await api.put(`/orders/${orderId}/status`, { status });
    return response.data;
  }
};

export const menuService = {
  fetchCategories: async () => {
    const response = await api.get('/menu/categories');
    return response.data;
  },
  
  fetchItemsByCategory: async (categoryId: number | string) => {
    const response = await api.get(`/menu/items?category=${categoryId}`);
    return response.data;
  },

  fetchAllItems: async () => {
    const response = await api.get('/menu/items');
    return response.data;
  }
};

export const tableService = {
  fetchTables: async () => {
    const response = await api.get('/tables');
    return response.data;
  }
};
