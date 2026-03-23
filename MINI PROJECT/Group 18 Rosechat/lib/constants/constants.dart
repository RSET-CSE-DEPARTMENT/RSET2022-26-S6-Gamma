import 'package:democalls/home_page.dart';
import 'package:democalls/login_page.dart';
import 'package:democalls/splash_screen.dart';
import 'package:flutter/material.dart';
import 'package:zego_uikit_prebuilt_call/zego_uikit_prebuilt_call.dart';

/// Class containing route names used in the app.
class PageRouteName {
  static const String splash = '/splash';
  static const String login = '/login';
  static const String home = '/home';
}

/// Represents a user with an ID and name.
class UserInfo {
  String id;
  String name;

  UserInfo({required this.id, required this.name});

  /// Checks if the user info is empty
  bool get isEmpty => id.isEmpty;

  /// Checks if the user info is not empty
  bool get isNotEmpty => id.isNotEmpty;

  /// Creates an empty user
  UserInfo.empty()
      : id = "",
        name = "";
}

/// Constants used throughout the app.
class Constants {
  /// Key for caching user ID in shared preferences.
  static const String cacheUserIDKey = "cache_user_id";

  /// Current logged-in user.
  static UserInfo currentUser = UserInfo.empty();

  /// Defines routes for navigation in the app.
  static final Map<String, WidgetBuilder> routes = {
    PageRouteName.splash: (context) => const SplashScreen(),
    PageRouteName.login: (context) => const LoginPage(),
    PageRouteName.home: (context) => const ZegoUIKitPrebuiltCallMiniPopScope(
          child: HomePage(),
        ),
  };

  /// Default text style for the app.
  static const TextStyle textStyle = TextStyle(
    color: Colors.black,
    fontSize: 13.0,
    decoration: TextDecoration.none,
  );
}