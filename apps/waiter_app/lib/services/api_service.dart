import 'dart:convert';
import 'package:http/http.dart' as http;
import '../theme_service.dart';

class ApiService {
  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
  };

  static Future<http.Response> get(String endpoint) async {
    return await http.get(
      Uri.parse('${ThemeService.apiBaseUrl}$endpoint'),
      headers: _headers,
    );
  }

  static Future<http.Response> post(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    return await http.post(
      Uri.parse('${ThemeService.apiBaseUrl}$endpoint'),
      headers: _headers,
      body: json.encode(body),
    );
  }

  static Future<http.Response> put(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    return await http.put(
      Uri.parse('${ThemeService.apiBaseUrl}$endpoint'),
      headers: _headers,
      body: json.encode(body),
    );
  }

  static Future<http.Response> delete(String endpoint) async {
    return await http.delete(
      Uri.parse('${ThemeService.apiBaseUrl}$endpoint'),
      headers: _headers,
    );
  }
}
