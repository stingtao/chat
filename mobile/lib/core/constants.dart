import 'dart:io';

import 'package:flutter/foundation.dart';

class AppConstants {
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:3000';
    if (Platform.isAndroid) return 'http://10.0.2.2:3000';
    return 'http://127.0.0.1:3000';
  }

  static const String hostApiPrefix = '/api/host';
  static const String clientApiPrefix = '/api/client';
}
