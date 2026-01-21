import 'package:freezed_annotation/freezed_annotation.dart';

part 'workspace_dto.freezed.dart';
part 'workspace_dto.g.dart';

@freezed
class WorkspaceDto with _$WorkspaceDto {
  const factory WorkspaceDto({
    required String id,
    required String name,
    required String slug,
    required String inviteCode,
    String? hostId,
    WorkspaceSettingsDto? settings,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _WorkspaceDto;

  factory WorkspaceDto.fromJson(Map<String, dynamic> json) =>
      _$WorkspaceDtoFromJson(json);
}

@freezed
class WorkspaceSettingsDto with _$WorkspaceSettingsDto {
  const factory WorkspaceSettingsDto({
    required String id,
    required String workspaceId,
    @Default('#3b82f6') String primaryColor,
    @Default('#10b981') String secondaryColor,
    String? logo,
    String? welcomeMessage,
    @Default(true) bool allowGroupChat,
    @Default(100) int maxGroupSize,
  }) = _WorkspaceSettingsDto;

  factory WorkspaceSettingsDto.fromJson(Map<String, dynamic> json) =>
      _$WorkspaceSettingsDtoFromJson(json);
}

@freezed
class WorkspaceMemberDto with _$WorkspaceMemberDto {
  const factory WorkspaceMemberDto({
    required String id,
    required String workspaceId,
    required String userId,
    required String memberTag,
    required String username,
    String? avatar,
    @Default('member') String role,
    DateTime? joinedAt,
    DateTime? lastSeenAt,
  }) = _WorkspaceMemberDto;

  factory WorkspaceMemberDto.fromJson(Map<String, dynamic> json) =>
      _$WorkspaceMemberDtoFromJson(json);
}

@freezed
class JoinWorkspaceRequest with _$JoinWorkspaceRequest {
  const factory JoinWorkspaceRequest({
    required String inviteCode,
  }) = _JoinWorkspaceRequest;

  factory JoinWorkspaceRequest.fromJson(Map<String, dynamic> json) =>
      _$JoinWorkspaceRequestFromJson(json);
}

@freezed
class WorkspaceListResponse with _$WorkspaceListResponse {
  const factory WorkspaceListResponse({
    required bool success,
    List<WorkspaceDto>? data,
    String? error,
  }) = _WorkspaceListResponse;

  factory WorkspaceListResponse.fromJson(Map<String, dynamic> json) =>
      _$WorkspaceListResponseFromJson(json);
}
