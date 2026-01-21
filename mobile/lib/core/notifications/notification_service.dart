import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/constants.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'notification_service.g.dart';

// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Handling background message: ${message.messageId}');
}

@Riverpod(keepAlive: true)
class NotificationService extends _$NotificationService {
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  FirebaseMessaging? _messaging;

  @override
  Future<void> build() async {
    await _initialize();
  }

  Future<void> _initialize() async {
    if (kIsWeb) return; // Skip on web for now

    try {
      // Initialize Firebase
      await Firebase.initializeApp();

      _messaging = FirebaseMessaging.instance;

      // Request permission
      final settings = await _messaging!.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional) {
        // Initialize local notifications
        await _initializeLocalNotifications();

        // Get FCM token and register with backend
        await _registerToken();

        // Listen for token refresh
        _messaging!.onTokenRefresh.listen(_onTokenRefresh);

        // Handle foreground messages
        FirebaseMessaging.onMessage.listen(_onForegroundMessage);

        // Handle background messages
        FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

        // Handle notification tap when app is in background
        FirebaseMessaging.onMessageOpenedApp.listen(_onNotificationTap);

        // Check if app was opened from notification
        final initialMessage = await _messaging!.getInitialMessage();
        if (initialMessage != null) {
          _onNotificationTap(initialMessage);
        }
      }
    } catch (e) {
      print('Notification service initialization error: $e');
    }
  }

  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onLocalNotificationTap,
    );

    // Create notification channel for Android
    if (Platform.isAndroid) {
      const channel = AndroidNotificationChannel(
        'chat_messages',
        'Chat Messages',
        description: 'Notifications for new chat messages',
        importance: Importance.high,
      );

      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);
    }
  }

  Future<void> _registerToken() async {
    try {
      final token = await _messaging!.getToken();
      if (token != null) {
        await _sendTokenToBackend(token);
      }
    } catch (e) {
      print('Failed to get FCM token: $e');
    }
  }

  Future<void> _onTokenRefresh(String token) async {
    await _sendTokenToBackend(token);
  }

  Future<void> _sendTokenToBackend(String token) async {
    try {
      final dio = ref.read(apiClientProvider);
      await dio.post(
        '${AppConstants.clientApiPrefix}/device-token',
        data: {
          'deviceToken': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
          'deviceName': Platform.localHostname,
        },
      );
      print('Device token registered successfully');
    } catch (e) {
      print('Failed to register device token: $e');
    }
  }

  void _onForegroundMessage(RemoteMessage message) {
    print('Received foreground message: ${message.messageId}');

    final notification = message.notification;
    final data = message.data;

    if (notification != null) {
      _showLocalNotification(
        title: notification.title ?? 'New Message',
        body: notification.body ?? '',
        payload: jsonEncode(data),
      );
    }
  }

  Future<void> _showLocalNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'chat_messages',
      'Chat Messages',
      channelDescription: 'Notifications for new chat messages',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      details,
      payload: payload,
    );
  }

  void _onNotificationTap(RemoteMessage message) {
    print('Notification tapped: ${message.data}');
    _handleNotificationNavigation(message.data);
  }

  void _onLocalNotificationTap(NotificationResponse response) {
    if (response.payload != null) {
      final data = jsonDecode(response.payload!) as Map<String, dynamic>;
      _handleNotificationNavigation(data);
    }
  }

  void _handleNotificationNavigation(Map<String, dynamic> data) {
    final type = data['type'] as String?;
    final workspaceId = data['workspaceId'] as String?;

    if (workspaceId == null) return;

    switch (type) {
      case 'message':
        final conversationType = data['conversationType'] as String?;
        final conversationId = data['conversationId'] as String?;

        if (conversationType == 'direct' && conversationId != null) {
          // Navigate to direct chat
          // This would typically use a navigation service or router
          print('Navigate to direct chat: $conversationId');
        } else if (conversationType == 'group' && conversationId != null) {
          // Navigate to group chat
          print('Navigate to group chat: $conversationId');
        }
        break;

      case 'friend_request':
        // Navigate to friend requests
        print('Navigate to friend requests');
        break;

      case 'group_invite':
        final groupId = data['groupId'] as String?;
        if (groupId != null) {
          // Navigate to group
          print('Navigate to group: $groupId');
        }
        break;
    }
  }

  Future<void> unregisterToken() async {
    if (_messaging == null) return;

    try {
      final token = await _messaging!.getToken();
      if (token != null) {
        final dio = ref.read(apiClientProvider);
        await dio.delete(
          '${AppConstants.clientApiPrefix}/device-token',
          queryParameters: {'token': token},
        );
      }
      await _messaging!.deleteToken();
    } catch (e) {
      print('Failed to unregister token: $e');
    }
  }
}

// Provider to initialize notification service on app start
@riverpod
Future<void> initializeNotifications(Ref ref) async {
  await ref.read(notificationServiceProvider.future);
}
