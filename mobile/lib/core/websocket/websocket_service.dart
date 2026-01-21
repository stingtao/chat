import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/auth/token_storage.dart';
import 'package:mobile/core/constants.dart';
import 'package:mobile/features/chat/data/dto/message_dto.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

part 'websocket_service.g.dart';

enum WSConnectionState {
  disconnected,
  connecting,
  connected,
  reconnecting,
}

class WSMessage {
  final String type;
  final dynamic payload;
  final int timestamp;

  WSMessage({
    required this.type,
    required this.payload,
    required this.timestamp,
  });

  factory WSMessage.fromJson(Map<String, dynamic> json) {
    return WSMessage(
      type: json['type'] as String,
      payload: json['payload'],
      timestamp: json['timestamp'] as int? ?? DateTime.now().millisecondsSinceEpoch,
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type,
    'payload': payload,
    'timestamp': timestamp,
  };
}

@Riverpod(keepAlive: true)
class WebSocketService extends _$WebSocketService {
  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  Timer? _reconnectTimer;
  Timer? _pingTimer;

  String? _currentWorkspaceId;
  String? _currentReceiverId;
  String? _currentGroupId;

  final _messageController = StreamController<WSMessage>.broadcast();
  Stream<WSMessage> get messageStream => _messageController.stream;

  @override
  WSConnectionState build() {
    ref.onDispose(() {
      disconnect();
      _messageController.close();
    });
    return WSConnectionState.disconnected;
  }

  Future<void> connect({
    required String workspaceId,
    String? receiverId,
    String? groupId,
  }) async {
    // If already connected to the same conversation, don't reconnect
    if (state == WSConnectionState.connected &&
        _currentWorkspaceId == workspaceId &&
        _currentReceiverId == receiverId &&
        _currentGroupId == groupId) {
      return;
    }

    // Disconnect previous connection
    await disconnect();

    _currentWorkspaceId = workspaceId;
    _currentReceiverId = receiverId;
    _currentGroupId = groupId;

    state = WSConnectionState.connecting;

    try {
      final token = await ref.read(tokenStorageProvider).getToken();
      if (token == null) {
        state = WSConnectionState.disconnected;
        return;
      }

      // Build WebSocket URL
      final wsUrl = _buildWsUrl(
        workspaceId: workspaceId,
        receiverId: receiverId,
        groupId: groupId,
        token: token,
      );

      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));

      await _channel!.ready;

      state = WSConnectionState.connected;

      _subscription = _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
      );

      // Start ping timer to keep connection alive
      _startPingTimer();
    } catch (e) {
      state = WSConnectionState.disconnected;
      _scheduleReconnect();
    }
  }

  String _buildWsUrl({
    required String workspaceId,
    String? receiverId,
    String? groupId,
    required String token,
  }) {
    final baseUrl = AppConstants.baseUrl.replaceFirst('http', 'ws');
    final queryParams = <String, String>{
      'token': token,
      'workspaceId': workspaceId,
    };

    if (receiverId != null) {
      queryParams['receiverId'] = receiverId;
    }
    if (groupId != null) {
      queryParams['groupId'] = groupId;
    }

    final queryString = queryParams.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');

    return '$baseUrl/ws?$queryString';
  }

  void _onMessage(dynamic data) {
    try {
      final json = jsonDecode(data as String) as Map<String, dynamic>;
      final message = WSMessage.fromJson(json);
      _messageController.add(message);
    } catch (e) {
      print('WebSocket message parse error: $e');
    }
  }

  void _onError(dynamic error) {
    print('WebSocket error: $error');
    state = WSConnectionState.disconnected;
    _scheduleReconnect();
  }

  void _onDone() {
    print('WebSocket connection closed');
    state = WSConnectionState.disconnected;
    _scheduleReconnect();
  }

  void _scheduleReconnect() {
    if (state == WSConnectionState.reconnecting) return;
    if (_currentWorkspaceId == null) return;

    state = WSConnectionState.reconnecting;

    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 3), () {
      if (_currentWorkspaceId != null) {
        connect(
          workspaceId: _currentWorkspaceId!,
          receiverId: _currentReceiverId,
          groupId: _currentGroupId,
        );
      }
    });
  }

  void _startPingTimer() {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (state == WSConnectionState.connected) {
        sendMessage(WSMessage(
          type: 'ping',
          payload: null,
          timestamp: DateTime.now().millisecondsSinceEpoch,
        ));
      }
    });
  }

  void sendMessage(WSMessage message) {
    if (state != WSConnectionState.connected || _channel == null) return;

    try {
      _channel!.sink.add(jsonEncode(message.toJson()));
    } catch (e) {
      print('WebSocket send error: $e');
    }
  }

  void sendTypingStart() {
    sendMessage(WSMessage(
      type: 'typing_start',
      payload: null,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    ));
  }

  void sendTypingStop() {
    sendMessage(WSMessage(
      type: 'typing_stop',
      payload: null,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    ));
  }

  void sendReadReceipt(String messageId) {
    sendMessage(WSMessage(
      type: 'message_read',
      payload: {'messageId': messageId},
      timestamp: DateTime.now().millisecondsSinceEpoch,
    ));
  }

  Future<void> disconnect() async {
    _pingTimer?.cancel();
    _reconnectTimer?.cancel();
    _subscription?.cancel();

    await _channel?.sink.close();
    _channel = null;

    _currentWorkspaceId = null;
    _currentReceiverId = null;
    _currentGroupId = null;

    state = WSConnectionState.disconnected;
  }
}

// Provider for listening to incoming messages
@riverpod
Stream<MessageDto> incomingMessages(Ref ref) {
  final wsService = ref.watch(webSocketServiceProvider.notifier);

  return wsService.messageStream
      .where((msg) => msg.type == 'new_message')
      .map((msg) => MessageDto.fromJson(msg.payload as Map<String, dynamic>));
}

// Provider for typing indicators
@riverpod
Stream<Map<String, bool>> typingIndicators(Ref ref) {
  final wsService = ref.watch(webSocketServiceProvider.notifier);
  final typingUsers = <String, bool>{};

  return wsService.messageStream
      .where((msg) => msg.type == 'typing_start' || msg.type == 'typing_stop')
      .map((msg) {
        final userId = msg.payload['userId'] as String?;
        if (userId != null) {
          typingUsers[userId] = msg.type == 'typing_start';
        }
        return Map<String, bool>.from(typingUsers);
      });
}
