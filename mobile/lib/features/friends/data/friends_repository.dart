import 'package:dio/dio.dart';
import 'package:mobile/core/api/api_client.dart';
import 'package:mobile/core/constants.dart';
import 'package:mobile/features/friends/data/dto/friend_dto.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'friends_repository.g.dart';

@riverpod
FriendsRepository friendsRepository(Ref ref) {
  return FriendsRepository(ref.watch(apiClientProvider));
}

class FriendsRepository {
  final Dio _dio;

  FriendsRepository(this._dio);

  Future<List<FriendDto>> getFriends(String workspaceId) async {
    final response = await _dio.get(
      '${AppConstants.clientApiPrefix}/friends',
      queryParameters: {'workspaceId': workspaceId},
    );

    if (response.data['success'] == true) {
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((json) => FriendDto.fromJson(json)).toList();
    }

    throw Exception(response.data['error'] ?? 'Failed to fetch friends');
  }

  Future<List<FriendRequestDto>> getPendingRequests(String workspaceId) async {
    final response = await _dio.get(
      '${AppConstants.clientApiPrefix}/friends/requests',
      queryParameters: {'workspaceId': workspaceId},
    );

    if (response.data['success'] == true) {
      final List<dynamic> data = response.data['data'] ?? [];
      return data.map((json) => FriendRequestDto.fromJson(json)).toList();
    }

    throw Exception(response.data['error'] ?? 'Failed to fetch friend requests');
  }

  Future<void> sendFriendRequest({
    required String workspaceId,
    required String receiverId,
  }) async {
    final response = await _dio.post(
      '${AppConstants.clientApiPrefix}/friends',
      data: {
        'workspaceId': workspaceId,
        'receiverId': receiverId,
      },
    );

    if (response.data['success'] != true) {
      throw Exception(response.data['error'] ?? 'Failed to send friend request');
    }
  }

  Future<void> respondToFriendRequest({
    required String workspaceId,
    required String friendshipId,
    required String action,
  }) async {
    final response = await _dio.put(
      '${AppConstants.clientApiPrefix}/friends',
      data: {
        'workspaceId': workspaceId,
        'friendshipId': friendshipId,
        'action': action,
      },
    );

    if (response.data['success'] != true) {
      throw Exception(response.data['error'] ?? 'Failed to respond to request');
    }
  }
}
