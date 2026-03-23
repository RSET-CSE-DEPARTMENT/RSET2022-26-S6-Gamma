import 'package:democalls/constants/common.dart';
import 'package:democalls/constants/constants.dart';
import 'package:democalls/constants/secrets.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:zego_uikit_prebuilt_call/zego_uikit_prebuilt_call.dart';
import 'package:zego_uikit_signaling_plugin/zego_uikit_signaling_plugin.dart';

// ✅ Removed duplicate `CurrentUser` class. Use `Constants.currentUser`

Future<void> login({required String userId, required String userName}) async {
  final pref = await SharedPreferences.getInstance();
  await pref.setString(Constants.cacheUserIDKey, userId);

  Constants.currentUser.id = userId;
  Constants.currentUser.name = userName;

  await onUserLogin(); // ✅ Ensure it completes before proceeding
}

Future<void> logOut() async {
  final pref = await SharedPreferences.getInstance();
  await pref.remove(Constants.cacheUserIDKey);

  await onUserLogout(); // ✅ Ensure cleanup completes
}

Future<void> onUserLogin() async {
  // ✅ Made async
  if (Constants.currentUser.id.isEmpty || Constants.currentUser.name.isEmpty) {
    return; // ✅ Prevent initialization if user details are missing
  }

  await ZegoUIKitPrebuiltCallInvitationService().init(
    appID: AppSecrets.apiKey, // ✅ Ensure these values exist in `secrets.dart`
    appSign: AppSecrets.apiSecret,
    userID: Constants.currentUser.id,
    userName: Constants.currentUser.name,
    plugins: [ZegoUIKitSignalingPlugin()],
    requireConfig: (ZegoCallInvitationData data) {
      final config =
          (data.invitees.length > 1)
              ? (ZegoCallInvitationType.videoCall == data.type
                  ? ZegoUIKitPrebuiltCallConfig.groupVideoCall()
                  : ZegoUIKitPrebuiltCallConfig.groupVoiceCall())
              : (ZegoCallInvitationType.videoCall == data.type
                  ? ZegoUIKitPrebuiltCallConfig.oneOnOneVideoCall()
                  : ZegoUIKitPrebuiltCallConfig.oneOnOneVoiceCall());

      config.avatarBuilder = customAvatarBuilder;
      config.topMenuBar.isVisible = true;
      config.topMenuBar.buttons.insert(
        0,
        ZegoCallMenuBarButtonName.minimizingButton,
      );
      config.topMenuBar.buttons.insert(
        1,
        ZegoCallMenuBarButtonName.soundEffectButton,
      );

      return config;
    },
  );
}

Future<void> onUserLogout() async {
  // ✅ Made async
  await ZegoUIKitPrebuiltCallInvitationService().uninit();
}
