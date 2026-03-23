import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:zego_uikit_prebuilt_call/zego_uikit_prebuilt_call.dart';

Widget customAvatarBuilder(
  BuildContext context,
  Size size,
  ZegoUIKitUser? user,
  Map<String, dynamic> extraInfo,
) {
  final String avatarUrl =
      user?.id != null
          ? 'https://robohash.org/${user!.id}.png'
          : 'https://robohash.org/default.png'; // ✅ Added fallback URL

  return CachedNetworkImage(
    imageUrl: avatarUrl,
    imageBuilder:
        (context, imageProvider) => Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            image: DecorationImage(image: imageProvider, fit: BoxFit.cover),
          ),
        ),
    progressIndicatorBuilder: (context, url, downloadProgress) {
      return Center(
        child: CircularProgressIndicator(
          value: downloadProgress.progress ?? 0.0, // ✅ Handles null progress
        ),
      );
    },
    errorWidget: (context, url, error) {
      debugPrint(
        'Error loading avatar for user: ${user?.id}',
      ); // ✅ Alternative to logInfo
      return ZegoAvatar(user: user, avatarSize: size);
    },
  );
}
