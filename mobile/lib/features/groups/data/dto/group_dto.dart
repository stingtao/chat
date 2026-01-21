import 'package:freezed_annotation/freezed_annotation.dart';

part 'group_dto.freezed.dart';
part 'group_dto.g.dart';

@freezed
class GroupDto with _$GroupDto {
  const factory GroupDto({
    required String id,
    required String workspaceId,
    required String name,
    String? avatar,
    required String createdById,
    List<GroupMemberDto>? members,
    int? memberCount,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _GroupDto;

  factory GroupDto.fromJson(Map<String, dynamic> json) =>
      _$GroupDtoFromJson(json);
}

@freezed
class GroupMemberDto with _$GroupMemberDto {
  const factory GroupMemberDto({
    required String id,
    required String groupId,
    required String userId,
    required String username,
    String? avatar,
    @Default('member') String role,
    DateTime? joinedAt,
  }) = _GroupMemberDto;

  factory GroupMemberDto.fromJson(Map<String, dynamic> json) =>
      _$GroupMemberDtoFromJson(json);
}

@freezed
class CreateGroupRequest with _$CreateGroupRequest {
  const factory CreateGroupRequest({
    required String workspaceId,
    required String name,
    required List<String> memberIds,
  }) = _CreateGroupRequest;

  factory CreateGroupRequest.fromJson(Map<String, dynamic> json) =>
      _$CreateGroupRequestFromJson(json);
}

@freezed
class UpdateGroupRequest with _$UpdateGroupRequest {
  const factory UpdateGroupRequest({
    required String groupId,
    String? name,
    List<String>? addMemberIds,
    List<String>? removeMemberIds,
  }) = _UpdateGroupRequest;

  factory UpdateGroupRequest.fromJson(Map<String, dynamic> json) =>
      _$UpdateGroupRequestFromJson(json);
}

@freezed
class GroupListResponse with _$GroupListResponse {
  const factory GroupListResponse({
    required bool success,
    List<GroupDto>? data,
    String? error,
  }) = _GroupListResponse;

  factory GroupListResponse.fromJson(Map<String, dynamic> json) =>
      _$GroupListResponseFromJson(json);
}
