import 'package:http/http.dart' as http;
import 'api_service.dart';

class OrderService {
  static Future<http.Response> placeOrder(
    Map<String, dynamic> orderData,
  ) async {
    return await ApiService.post('/api/orders', orderData);
  }

  static Future<http.Response> fetchOrders() async {
    return await ApiService.get('/api/orders');
  }

  static Future<http.Response> updateOrderStatus(
    dynamic orderId,
    String status,
  ) async {
    return await ApiService.put('/api/orders/$orderId/status', {
      'status': status,
    });
  }
}
