import 'package:democalls/constants/constants.dart';
import 'package:democalls/services/login_service.dart' as services;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:zego_uikit_prebuilt_call/zego_uikit_prebuilt_call.dart';
import 'package:zego_uikit_signaling_plugin/zego_uikit_signaling_plugin.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final pref = await SharedPreferences.getInstance();
  final cacheUserId = pref.getString(Constants.cacheUserIDKey) ?? "";

  if (cacheUserId.isNotEmpty) {
    Constants.currentUser.id = cacheUserId;
    Constants.currentUser.name = "user_$cacheUserId";
  }

  final navigatorKey = GlobalKey<NavigatorState>();
  ZegoUIKitPrebuiltCallInvitationService().setNavigatorKey(navigatorKey);

  ZegoUIKit().initLog().then((value) {
    runApp(MyApp(navigatorKey: navigatorKey));
  });
}

class MyApp extends StatefulWidget {
  final GlobalKey<NavigatorState> navigatorKey;
  const MyApp({super.key, required this.navigatorKey});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();

    ZegoUIKitPrebuiltCallInvitationService().useSystemCallingUI([
      ZegoUIKitSignalingPlugin(),
    ]);

    Future.microtask(() {
      if (Constants.currentUser.id.isNotEmpty) {
        services.onUserLogin();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false, // Removes debug banner
      routes: Constants.routes,
      initialRoute: PageRouteName.splash, // Start with splash screen
      theme: ThemeData(fontFamily: GoogleFonts.poppins().fontFamily),
      navigatorKey: widget.navigatorKey,
      builder: (context, child) {
        if (child == null) {
          return const SizedBox.shrink();
        }
        return Stack(
          children: [
            child,
            ZegoUIKitPrebuiltCallMiniOverlayPage(
              contextQuery: () => widget.navigatorKey.currentState!.context,
            ),
          ],
        );
      },
    );
  }
}
