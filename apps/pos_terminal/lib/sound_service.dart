import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

class SoundService extends ChangeNotifier {
  static final SoundService _instance = SoundService._internal();
  factory SoundService() => _instance;
  SoundService._internal();

  final AudioPlayer _player = AudioPlayer();
  bool _enabled = true;
  double _volume = 0.8;
  String _selectedSound = 'Classic Ding';

  bool get enabled => _enabled;
  double get volume => _volume;
  String get selectedSound => _selectedSound;

  final List<String> availableSounds = [
    'Classic Ding',
    'Modern Alert',
    'Kitchen Chime',
    'Soft Notification',
  ];

  void setEnabled(bool value) {
    _enabled = value;
    notifyListeners();
  }

  void setVolume(double value) {
    _volume = value;
    _player.setVolume(value);
    notifyListeners();
  }

  void setSound(String sound) {
    _selectedSound = sound;
    notifyListeners();
  }

  void initialize(Map<String, dynamic> config) {
    _enabled = config['notification_sound'] ?? true;
    _volume = (config['notification_volume'] ?? 0.8).toDouble();
    _selectedSound = config['notification_sound_name'] ?? 'Classic Ding';
    _player.setVolume(_volume);
    notifyListeners();
  }

  Future<void> playNotification() async {
    play(_selectedSound);
  }

  Future<void> play(String soundName) async {
    if (!_enabled) return;
    
    String url;
    switch (soundName) {
      case 'Modern Alert':
        url = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'; // Classic short
        break;
      case 'Kitchen Chime':
        url = 'https://assets.mixkit.co/active_storage/sfx/1010/1010-preview.mp3'; // Bell ding
        break;
      case 'Soft Notification':
        url = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3'; // Soft electronic beep
        break;
      case 'Classic Ding':
      default:
        url = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Traditional notification bell
        break;
    }
    
    try {
      await _player.play(UrlSource(url));
    } catch (e) {
      debugPrint('Error playing sound: $e');
    }
  }
}
