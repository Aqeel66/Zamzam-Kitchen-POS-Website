import 'package:http/http.dart' as http;
import 'api_service.dart';

class ReservationService {
  static Future<http.Response> fetchReservations() async {
    return await ApiService.get('/api/reservations');
  }

  static Future<http.Response> createReservation(
    Map<String, dynamic> data,
  ) async {
    return await ApiService.post('/api/reservations', data);
  }

  static Future<http.Response> updateReservationStatus(
    dynamic id,
    String status,
  ) async {
    return await ApiService.put('/api/reservations/$id/status', {
      'status': status,
    });
  }

  static Future<http.Response> deleteReservation(dynamic id) async {
    return await ApiService.delete('/api/reservations/$id');
  }
}
