import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:mobile/features/chat/data/dto/message_dto.dart';

part 'chat_state.freezed.dart';

@freezed
class ChatState with _$ChatState {
  const factory ChatState({
    @Default([]) List<MessageDto> messages,
    @Default(false) bool isLoading,
    @Default(false) bool isSending,
    String? error,
    String? currentWorkspaceId,
    String? currentReceiverId,
    String? currentGroupId,
  }) = _ChatState;
}

@freezed
class ConversationListState with _$ConversationListState {
  const factory ConversationListState({
    @Default([]) List<ConversationDto> conversations,
    @Default(false) bool isLoading,
    String? error,
  }) = _ConversationListState;
}
