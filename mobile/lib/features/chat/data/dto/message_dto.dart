import 'package:freezed_annotation/freezed_annotation.dart';

part 'message_dto.freezed.dart';
part 'message_dto.g.dart';

@freezed
class MessageDto with _$MessageDto {
  const factory MessageDto({
    required String id,
    required String workspaceId,
    required String senderId,
    String? receiverId,
    String? groupId,
    required String content,
    @Default('text') String type,
    String? fileUrl,
    String? senderName,
    String? senderAvatar,
    @Default('[]') String readBy,
    required DateTime createdAt,
    DateTime? updatedAt,
  }) = _MessageDto;

  factory MessageDto.fromJson(Map<String, dynamic> json) =>
      _$MessageDtoFromJson(json);
}

@freezed
class SendMessageRequest with _$SendMessageRequest {
  const factory SendMessageRequest({
    required String workspaceId,
    required String content,
    String? receiverId,
    String? groupId,
    @Default('text') String type,
    String? fileUrl,
  }) = _SendMessageRequest;

  factory SendMessageRequest.fromJson(Map<String, dynamic> json) =>
      _$SendMessageRequestFromJson(json);
}

@freezed
class MessageListResponse with _$MessageListResponse {
  const factory MessageListResponse({
    required bool success,
    List<MessageDto>? data,
    String? error,
  }) = _MessageListResponse;

  factory MessageListResponse.fromJson(Map<String, dynamic> json) =>
      _$MessageListResponseFromJson(json);
}

@freezed
class ConversationDto with _$ConversationDto {
  const factory ConversationDto({
    required String id,
    required String name,
    String? avatar,
    required ConversationType type,
    MessageDto? lastMessage,
    int? unreadCount,
    DateTime? lastMessageAt,
  }) = _ConversationDto;

  factory ConversationDto.fromJson(Map<String, dynamic> json) =>
      _$ConversationDtoFromJson(json);
}

enum ConversationType {
  @JsonValue('direct')
  direct,
  @JsonValue('group')
  group,
}
