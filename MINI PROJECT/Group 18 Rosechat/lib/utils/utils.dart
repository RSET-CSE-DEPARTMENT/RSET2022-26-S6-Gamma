import 'dart:convert';
import 'dart:io';
// ignore: depend_on_referenced_packages
import 'package:logger/logger.dart';

// ✅ Info-level logging

import 'package:device_info_plus/device_info_plus.dart';
import 'package:crypto/crypto.dart';

Future<String> getUniqueUserId() async {
  String? deviceId;
  final deviceInfo = DeviceInfoPlugin();

  final Logger logger = Logger();

  logger.i("User logged in successfully!");

  try {
    if (Platform.isIOS) {
      final iosDeviceInfo = await deviceInfo.iosInfo;
      deviceId = iosDeviceInfo.identifierForVendor;
    } else if (Platform.isAndroid) {
      final androidDeviceInfo = await deviceInfo.androidInfo;
      deviceId = androidDeviceInfo.id;
    }

    // If deviceId is still null, assign default values
    deviceId ??=
        Platform.isIOS ? "flutter_user_id_ios" : "flutter_user_id_android";

    // Append platform info if length is too short
    if (deviceId.length < 4) {
      deviceId += Platform.isIOS ? "__ios__" : "__android__";
    }

    // Ensure deviceId is valid before hashing
    final userId = md5
        .convert(utf8.encode(deviceId))
        .toString()
        .replaceAll(RegExp(r'[^0-9]'), "");

    return userId.substring(userId.length - 6); // Return last 6 digits
  } catch (e) {
    logger.i("Error getting unique user ID: $e");
    return "000000"; // Fallback value to prevent crash
  }
}
