import 'package:mobile/features/workspace/data/dto/workspace_dto.dart';
import 'package:mobile/features/workspace/data/workspace_repository.dart';
import 'package:mobile/features/workspace/domain/workspace_state.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'workspace_controller.g.dart';

@Riverpod(keepAlive: true)
class WorkspaceController extends _$WorkspaceController {
  @override
  WorkspaceState build() {
    return const WorkspaceState();
  }

  Future<void> loadWorkspaces() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final repository = ref.read(workspaceRepositoryProvider);
      final workspaces = await repository.getWorkspaces();

      state = state.copyWith(
        workspaces: workspaces,
        isLoading: false,
        currentWorkspace: workspaces.isNotEmpty ? workspaces.first : null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> joinWorkspace(String inviteCode) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final repository = ref.read(workspaceRepositoryProvider);
      final workspace = await repository.joinWorkspace(inviteCode);

      state = state.copyWith(
        workspaces: [...state.workspaces, workspace],
        currentWorkspace: workspace,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  void selectWorkspace(WorkspaceDto workspace) {
    state = state.copyWith(currentWorkspace: workspace);
  }

  Future<void> loadMembers() async {
    if (state.currentWorkspace == null) return;

    try {
      final repository = ref.read(workspaceRepositoryProvider);
      final members = await repository.getWorkspaceMembers(
        state.currentWorkspace!.id,
      );

      state = state.copyWith(members: members);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}
