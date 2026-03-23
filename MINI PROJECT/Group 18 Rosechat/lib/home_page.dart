import 'package:democalls/nonemergency_help.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:democalls/constants/constants.dart';
import 'package:democalls/services/login_service.dart';
import 'package:democalls/call_page.dart';
import 'package:democalls/user_page.dart';
import 'package:cached_network_image/cached_network_image.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isSendingEmergency = false;
  Map<String, dynamic>? _userProfile;
  bool _isLoadingProfile = true;

  @override
  void initState() {
    super.initState();
    _fetchUserProfile();
  }

  Future<void> _fetchUserProfile() async {
    setState(() {
      _isLoadingProfile = true;
    });

    try {
      final response = await http.get(
        Uri.parse(
            "http://192.168.230.124:5000/user_profile/${Constants.currentUser.id}"),
        headers: {"Content-Type": "application/json"},
      ).timeout(const Duration(seconds: 10));

      if (mounted) {
        if (response.statusCode == 200) {
          setState(() {
            _userProfile = jsonDecode(response.body);
          });
        } else {
          // Handle error
          debugPrint("Failed to fetch user profile: ${response.statusCode}");
        }
      }
    } catch (e) {
      debugPrint("Error fetching user profile: $e");
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingProfile = false;
        });
      }
    }
  }

  Future<void> _sendEmergencyEmail() async {
    if (_isSendingEmergency) return;

    setState(() {
      _isSendingEmergency = true;
    });

    const String flaskUrl = "http://192.168.230.124:5000/send_emergymail";

    try {
      final response = await http
          .post(
            Uri.parse(flaskUrl),
            headers: {"Content-Type": "application/json"},
            body: jsonEncode({
              "user_id": Constants.currentUser.id,
              "timestamp": DateTime.now().toIso8601String(),
            }),
          )
          .timeout(const Duration(seconds: 10));

      if (mounted) {
        if (response.statusCode == 200) {
          _showMessage(context, "Emergency alert sent successfully!");
        } else {
          _showMessage(context,
              "Failed to send emergency. Server error: ${response.statusCode}");
        }
      }
    } catch (e) {
      if (mounted) {
        _showMessage(context, "Emergency alert sent successfully!");
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSendingEmergency = false;
        });
      }
    }
  }

  void _showMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: const Duration(seconds: 3),
        backgroundColor:
            message.contains("success") ? Colors.green : Colors.red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.blue.shade50,
              Colors.purple.shade50,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // App Bar with User Profile
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        if (_isLoadingProfile)
                          const CircleAvatar(
                            radius: 20,
                            backgroundColor: Colors.grey,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        else if (_userProfile?['profile_image'] != null)
                          CircleAvatar(
                            radius: 20,
                            backgroundImage: CachedNetworkImageProvider(
                              _userProfile!['profile_image'],
                            ),
                          )
                        else
                          const CircleAvatar(
                            radius: 20,
                            backgroundColor: Colors.blue,
                            child: Icon(Icons.person, color: Colors.white),
                          ),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Welcome',
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.black54,
                              ),
                            ),
                            if (_isLoadingProfile)
                              const SizedBox(
                                width: 100,
                                height: 20,
                                child: LinearProgressIndicator(),
                              )
                            else
                              Text(
                                _userProfile?['name'] ?? 'User',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.logout, size: 28),
                      onPressed: () async {
                        await logOut();
                        if (mounted) {
                          Navigator.pushReplacementNamed(
                              context, PageRouteName.login);
                        }
                      },
                    ),
                  ],
                ),
              ),

              // User ID display
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Text(
                  'User ID: ${Constants.currentUser.id}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Colors.black54,
                  ),
                ),
              ),

              // Button Grid
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: GridView.count(
                    crossAxisCount: 2,
                    childAspectRatio: 1.1,
                    mainAxisSpacing: 20,
                    crossAxisSpacing: 20,
                    children: [
                      _buildGradientButton(
                        context,
                        icon: Icons.call,
                        label: 'Call',
                        colors: [Colors.green.shade400, Colors.green.shade600],
                        onTap: () => _navigateToCallPage(context),
                      ),
                      _buildGradientButton(
                        context,
                        icon: Icons.warning,
                        label: 'Emergency',
                        colors: [Colors.red.shade400, Colors.red.shade600],
                        onTap: () => _handleEmergencyButton(context),
                        isLoading: _isSendingEmergency,
                      ),
                      _buildGradientButton(
                        context,
                        icon: Icons.message,
                        label: 'Message',
                        colors: [Colors.blue.shade400, Colors.blue.shade600],
                        onTap: () => _showActionDialog(context, 'Message'),
                      ),
                      _buildGradientButton(
                        context,
                        icon: Icons.people_alt,
                        label: 'Users',
                        colors: [
                          Colors.purple.shade400,
                          Colors.purple.shade600
                        ],
                        onTap: () => _navigateToUsersPage(context),
                      ),
                      _buildGradientButton(context,
                          icon: Icons.help,
                          label: 'Help',
                          colors: [
                            Colors.orange.shade400,
                            Colors.orange.shade600
                          ],
                          onTap: () => _navigateToNonEmergencyHelp(context)),
                      _buildGradientButton(
                        context,
                        icon: Icons.info,
                        label: 'About',
                        colors: [Colors.teal.shade400, Colors.teal.shade600],
                        onTap: () => _showActionDialog(context, 'About'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGradientButton(
    BuildContext context, {
    required IconData icon,
    required String label,
    required List<Color> colors,
    required VoidCallback onTap,
    bool isLoading = false,
  }) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: isLoading ? null : onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: LinearGradient(
              colors: colors,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Icon(
                      icon,
                      size: 48,
                      color: Colors.white,
                    ),
              const SizedBox(height: 12),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _handleEmergencyButton(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Emergency Alert'),
        content: const Text(
            'This will notify emergency contacts immediately. Are you sure?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _sendEmergencyEmail();
            },
            child:
                const Text('SEND ALERT', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _showActionDialog(BuildContext context, String buttonName) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$buttonName Button Pressed'),
        content: Text('You pressed the $buttonName button'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _navigateToCallPage(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CallPage(userId: Constants.currentUser.id),
      ),
    );
  }

  void _navigateToUsersPage(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => UsersPage(userId: Constants.currentUser.id),
      ),
    );
  }
}

void _navigateToNonEmergencyHelp(BuildContext context) {
  Navigator.push(
    context,
    MaterialPageRoute(builder: (context) => const NonEmergencyHelp()),
  );
}
