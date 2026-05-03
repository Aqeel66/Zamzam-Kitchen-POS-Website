import 'dart:io';

void main() {
  final file = File('apps/pos_terminal/lib/localization_service.dart');
  final lines = file.readAsLinesSync();
  
  Map<String, List<int>> keys = {};
  String currentLang = '';
  
  for (int i = 0; i < lines.length; i++) {
    final line = lines[i].trim();
    if (line.contains("': {")) {
      currentLang = line.split("'")[1];
      keys[currentLang] = [];
    }
    
    if (line.contains("': '")) {
      final key = line.split("'")[1];
      if (keys[currentLang]!.contains(key.hashCode)) {
         print('Duplicate key in $currentLang: $key at line ${i + 1}');
      }
      keys[currentLang]!.add(key.hashCode);
    }
  }
}
