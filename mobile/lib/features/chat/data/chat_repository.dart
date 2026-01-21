import 'package:dio/dio.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/constants.dart';
import 'package:mobile/features/chat/data/dto/message_dto.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'chat_repository.g.dart';

@riverpod
ChatRepository chatRepository(Ref ref) {
  return ChatRepository(ref.watch(apiClientProvider));
}

class ChatRepository {
  final Dio _dio;

  ChatRepository(this._dio);

  Future<List<MessageDto>> getMessages({
    required String workspaceId,
    String? receiverId,
    String? groupId,
    int limit = 50,
  }) async {
    final queryParams = <String, dynamic>{
      'workspaceId': workspaceId,
      'limit': limit,
    };

    if (receiverId != null) {
      queryParams['receiverId'] = receiverId;
    }
    if (groupId != null) {
      queryParams['groupId'] = groupId;
    }

    final response = await _dio.get(
      '${AppConstants.clientApiPrefix}/messages',
      queryParameters: queryParams,
    );

    if (response.data['success'] == true) {
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((json) => MessageDto.fromJson(json)).toList();
    }

    throw Exception(response.data['error'] ?? 'Failed to fetch messages');
  }

  Future<MessageDto> sendMessage(SendMessageRequest request) async {
    final response = await _dio.post(
      '${AppConstants.clientApiPrefix}/messages',
      data: request.toJson(),
    );

    if (response.data['success'] == true) {
      return MessageDto.fromJson(response.data['data']);
    }

    throw Exception(response.data['error'] ?? 'Failed to send message');
  }

  Future<void> markAsRead({
    required String workspaceId,
    required String messageId,
  }) async {
    await _dio.put(
      '${AppConstants.clientApiPrefix}/messages/read',
      data: {
        'workspaceId': workspaceId,
        'messageId': messageId,
      },
    );
  }
}
