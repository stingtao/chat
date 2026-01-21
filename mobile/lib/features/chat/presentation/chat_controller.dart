import 'package:mobile/features/chat/data/chat_repository.dart';
import 'package:mobile/features/chat/data/dto/message_dto.dart';
import 'package:mobile/features/chat/domain/chat_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'chat_controller.g.dart';

@riverpod
class ChatController extends _$ChatController {
  @override
  ChatState build() {
    return const ChatState();
  }

  Future<void> loadMessages({
    required String workspaceId,
    String? receiverId,
    String? groupId,
  }) async {
    state = state.copyWith(
      isLoading: true,
      error: null,
      currentWorkspaceId: workspaceId,
      currentReceiverId: receiverId,
      currentGroupId: groupId,
    );

    try {
      final repository = ref.read(chatRepositoryProvider);
      final messages = await repository.getMessages(
        workspaceId: workspaceId,
        receiverId: receiverId,
        groupId: groupId,
      );

      state = state.copyWith(
        messages: messages,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> sendMessage(String content, {String type = 'text', String? fileUrl}) async {
    if (state.currentWorkspaceId == null) return;
    if (state.currentReceiverId == null && state.currentGroupId == null) return;

    state = state.copyWith(isSending: true, error: null);

    try {
      final repository = ref.read(chatRepositoryProvider);
      final message = await repository.sendMessage(
        SendMessageRequest(
          workspaceId: state.currentWorkspaceId!,
          content: content,
          receiverId: state.currentReceiverId,
          groupId: state.currentGroupId,
          type: type,
          fileUrl: fileUrl,
        ),
      );

      state = state.copyWith(
        messages: [...state.messages, message],
        isSending: false,
      );
    } catch (e) {
      state = state.copyWith(
        isSending: false,
        error: e.toString(),
      );
    }
  }

  void addMessage(MessageDto message) {
    // Avoid duplicates
    if (state.messages.any((m) => m.id == message.id)) return;

    state = state.copyWith(
      messages: [...state.messages, message],
    );
  }

  void clearChat() {
    state = const ChatState();
  }
}
