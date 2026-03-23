import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:permission_handler/permission_handler.dart';
import 'package:zego_uikit_prebuilt_call/zego_uikit_prebuilt_call.dart';

class CallPage extends StatefulWidget {
  final String userId;

  const CallPage({super.key, required this.userId});

  @override
  _CallPageState createState() => _CallPageState();
}

class _CallPageState extends State<CallPage> {
  List<dynamic> contacts = [];
  final String serverUrl = "http://192.168.230.124:5000";
  bool _isLoading = true;
  final TextEditingController inviteeUserIDTextCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _requestPermissions();
    fetchContacts();
  }

  @override
  void dispose() {
    inviteeUserIDTextCtrl.dispose();
    super.dispose();
  }

  Future<void> _requestPermissions() async {
    final cameraStatus = await Permission.camera.request();
    final micStatus = await Permission.microphone.request();

    if (!cameraStatus.isGranted || !micStatus.isGranted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              "Camera and/or Microphone permissions are required for calls"),
        ),
      );
    }
  }

  Future<void> fetchContacts() async {
    try {
      final response = await http.get(
        Uri.parse('$serverUrl/get_contacts?user_phone=${widget.userId}'),
      );

      if (response.statusCode == 200) {
        setState(() {
          contacts = json.decode(response.body);
          _isLoading = false;
        });
      } else {
        throw Exception('Failed to load contacts');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Failed to load contacts: ${e.toString()}")),
      );
    }
  }

  Widget sendCallButton(
      {required bool isVideoCall, required String phoneNumber}) {
    inviteeUserIDTextCtrl.text = phoneNumber;

    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: inviteeUserIDTextCtrl,
      builder: (context, value, _) {
        final invitees =
            getInvitesFromTextCtrl(inviteeUserIDTextCtrl.text.trim());
        return ZegoSendCallInvitationButton(
          isVideoCall: isVideoCall,
          invitees: invitees,
          resourceID: 'zego_data',
          iconSize: const Size(60, 60),
          buttonSize: const Size(80, 80),
          // Remove the icon parameter or use the correct ButtonIcon type
        );
      },
    );
  }

  List<ZegoUIKitUser> getInvitesFromTextCtrl(String text) {
    final invitees = <ZegoUIKitUser>[];
    final inviteeIDs = text.split(',');
    for (var id in inviteeIDs) {
      final trimmedID = id.trim();
      if (trimmedID.isNotEmpty) {
        invitees.add(ZegoUIKitUser(id: trimmedID, name: 'user_$trimmedID'));
      }
    }
    return invitees;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Contacts"),
        backgroundColor: Colors.blueAccent,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : contacts.isEmpty
              ? const Center(child: Text("No contacts available"))
              : GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 0.8,
                  ),
                  itemCount: contacts.length,
                  itemBuilder: (context, index) {
                    final contact = contacts[index];
                    return GestureDetector(
                      onTap: () => _showCallOptions(context, contact),
                      child: Column(
                        children: [
                          CircleAvatar(
                            radius: 60,
                            backgroundImage: contact['profile_image'] != null &&
                                    contact['profile_image'].isNotEmpty
                                ? CachedNetworkImageProvider(
                                    contact['profile_image'])
                                : null,
                            child: contact['profile_image'] == null ||
                                    contact['profile_image'].isEmpty
                                ? const Icon(Icons.person, size: 60)
                                : null,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            contact['name'] ?? "Unknown",
                            style: const TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            contact['phone'] ?? "",
                            style: const TextStyle(
                                fontSize: 14, color: Colors.grey),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    );
                  },
                ),
    );
  }

  void _showCallOptions(BuildContext context, dynamic contact) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "Call ${contact['name'] ?? 'Unknown'}",
                style:
                    const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 30),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Video Call Button
                  Column(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: Colors.blueAccent.withOpacity(0.2),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: sendCallButton(
                            isVideoCall: true,
                            phoneNumber: contact['phone'] ?? '',
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Video Call",
                        style: TextStyle(fontSize: 16),
                      ),
                    ],
                  ),
                  const SizedBox(width: 40),
                  // Audio Call Button
                  Column(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: Colors.green.withOpacity(0.2),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: sendCallButton(
                            isVideoCall: false,
                            phoneNumber: contact['phone'] ?? '',
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Audio Call",
                        style: TextStyle(fontSize: 16),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 30),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => Navigator.pop(context),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey,
                  ),
                  child: const Text("Cancel"),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
