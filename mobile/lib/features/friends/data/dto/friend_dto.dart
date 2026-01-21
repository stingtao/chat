import 'package:freezed_annotation/freezed_annotation.dart';

part 'friend_dto.freezed.dart';
part 'friend_dto.g.dart';

@freezed
class FriendDto with _$FriendDto {
  const factory FriendDto({
    required String id,
    required String username,
    String? avatar,
    required String memberTag,
    DateTime? lastSeenAt,
    @Default(false) bool isOnline,
  }) = _FriendDto;

  factory FriendDto.fromJson(Map<String, dynamic> json) =>
      _$FriendDtoFromJson(json);
}

@freezed
class FriendRequestDto with _$FriendRequestDto {
  const factory FriendRequestDto({
    required String id,
    required String senderId,
    required String receiverId,
    required String senderName,
    String? senderAvatar,
    required String senderMemberTag,
    @Default('pending') String status,
    required DateTime createdAt,
  }) = _FriendRequestDto;

  factory FriendRequestDto.fromJson(Map<String, dynamic> json) =>
      _$FriendRequestDtoFromJson(json);
}

@freezed
class SendFriendRequestRequest with _$SendFriendRequestRequest {
  const factory SendFriendRequestRequest({
    required String workspaceId,
    required String receiverId,
  }) = _SendFriendRequestRequest;

  factory SendFriendRequestRequest.fromJson(Map<String, dynamic> json) =>
      _$SendFriendRequestRequestFromJson(json);
}

@freezed
class RespondFriendRequestRequest with _$RespondFriendRequestRequest {
  const factory RespondFriendRequestRequest({
    required String workspaceId,
    required String friendshipId,
    required String action, // accept or reject
  }) = _RespondFriendRequestRequest;

  factory RespondFriendRequestRequest.fromJson(Map<String, dynamic> json) =>
      _$RespondFriendRequestRequestFromJson(json);
}

@freezed
class FriendListResponse with _$FriendListResponse {
  const factory FriendListResponse({
    required bool success,
    List<FriendDto>? data,
    String? error,
  }) = _FriendListResponse;

  factory FriendListResponse.fromJson(Map<String, dynamic> json) =>
      _$FriendListResponseFromJson(json);
}

@freezed
class FriendRequestListResponse with _$FriendRequestListResponse {
  const factory FriendRequestListResponse({
    required bool success,
    List<FriendRequestDto>? data,
    String? error,
  }) = _FriendRequestListResponse;

  factory FriendRequestListResponse.fromJson(Map<String, dynamic> json) =>
      _$FriendRequestListResponseFromJson(json);
}
