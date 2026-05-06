import 'package:intl/intl.dart';

class POSUtils {
  static String getLapseTime(String? orderTimeStr) {
    if (orderTimeStr == null) return '--:--';
    try {
      DateTime orderTime = DateTime.parse(orderTimeStr).toLocal();
      Duration diff = DateTime.now().toLocal().difference(orderTime);
      if (diff.isNegative) return "00:00";
      int minutes = diff.inMinutes;
      int seconds = diff.inSeconds % 60;
      return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
    } catch (_) {
      return '--:--';
    }
  }

  static String formatDateTime(String? dateTimeStr) {
    if (dateTimeStr == null) return '--:--';
    try {
      final date = DateTime.parse(dateTimeStr).toLocal();
      return DateFormat('HH:mm').format(date);
    } catch (_) {
      return '--:--';
    }
  }
}
