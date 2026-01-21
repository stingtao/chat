import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:mobile/features/workspace/data/dto/workspace_dto.dart';

part 'workspace_state.freezed.dart';

@freezed
class WorkspaceState with _$WorkspaceState {
  const factory WorkspaceState({
    @Default([]) List<WorkspaceDto> workspaces,
    WorkspaceDto? currentWorkspace,
    @Default([]) List<WorkspaceMemberDto> members,
    @Default(false) bool isLoading,
    String? error,
  }) = _WorkspaceState;
}
