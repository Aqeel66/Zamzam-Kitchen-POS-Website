import 'dart:io';

void main() {
  final file = File('d:/Anti-Gravity Projects/Backups/IRM -Backup 4-5-26 1-28pm/apps/pos_terminal/lib/localization_service.dart');
  final lines = file.readAsLinesSync();
  
  Map<String, List<int>> englishKeys = {};
  Map<String, List<int>> arabicKeys = {};
  Map<String, List<int>> urduKeys = {};
  
  String currentLocale = '';
  
  for (int i = 0; i < lines.length; i++) {
    final line = lines[i].trim();
    if (line.contains("'English': {")) currentLocale = 'English';
    else if (line.contains("'Arabic': {")) currentLocale = 'Arabic';
    else if (line.contains("'Urdu': {")) currentLocale = 'Urdu';
    
    if (line.startsWith("'") && line.contains("':")) {
      final key = line.split("':")[0].replaceAll("'", "").trim();
      if (currentLocale == 'English') {
        englishKeys.putIfAbsent(key, () => []).add(i + 1);
      } else if (currentLocale == 'Arabic') {
        arabicKeys.putIfAbsent(key, () => []).add(i + 1);
      } else if (currentLocale == 'Urdu') {
        urduKeys.putIfAbsent(key, () => []).add(i + 1);
      }
    }
  }
  
  print('English duplicates:');
  englishKeys.forEach((key, lines) {
    if (lines.length > 1) print('$key: $lines');
  });
  
  print('\nArabic duplicates:');
  arabicKeys.forEach((key, lines) {
    if (lines.length > 1) print('$key: $lines');
  });
  
  print('\nUrdu duplicates:');
  urduKeys.forEach((key, lines) {
    if (lines.length > 1) print('$key: $lines');
  });
}
