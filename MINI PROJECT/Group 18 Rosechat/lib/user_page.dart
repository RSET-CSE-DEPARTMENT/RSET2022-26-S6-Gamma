import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class UsersPage extends StatefulWidget {
  final String userId;

  const UsersPage({super.key, required this.userId});

  @override
  _UsersPageState createState() => _UsersPageState();
}

class _UsersPageState extends State<UsersPage> {
  List<dynamic> users = [];

  @override
  void initState() {
    super.initState();
    fetchUsers();
  }

  Future<void> fetchUsers() async {
    final response = await http.get(Uri.parse(
        'http://192.168.230.124:5000/get_users?logged_in_phone=${widget.userId}'));

    if (response.statusCode == 200) {
      List<dynamic> allUsers = json.decode(response.body);
      setState(() {
        users = allUsers;
      });

      // Debugging: Print fetched user details
      for (var user in users) {
        print(
            'User: ${user['name']}, Email: ${user['email']}, Profile Image: ${correctImageUrl(user['profile_image'])}');
      }
    } else {
      throw Exception('Failed to load users');
    }
  }

  Future<void> addToContacts(String phone) async {
    SharedPreferences prefs = await SharedPreferences.getInstance();

    final response = await http.post(
      Uri.parse('http://192.168.230.124:5000/add_contact'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(
          {'logged_in_user_phone': widget.userId, 'contact_user_phone': phone}),
    );

    if (response.statusCode == 200) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('User added to contacts successfully!')),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to add user to contacts')),
      );
    }
  }

  // Function to correct the image URL (Fix IP address issue)
  String correctImageUrl(String url) {
    if (url.contains('192.168.82.182')) {
      return url.replaceFirst('192.168.82.182', '192.168.230.124');
    }
    return url;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Users')),
      body: users.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: users.length,
              itemBuilder: (context, index) {
                var user = users[index];
                String imageUrl = correctImageUrl(user['profile_image']);
                print(
                    'Displaying Image: $imageUrl'); // Debugging: Print Image URL

                return Card(
                  margin: const EdgeInsets.all(10),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                  child: Padding(
                    padding: const EdgeInsets.all(10.0),
                    child: Column(
                      children: [
                        user['profile_image'] != null &&
                                user['profile_image'] != ''
                            ? CircleAvatar(
                                radius: 50,
                                backgroundImage: NetworkImage(imageUrl),
                                onBackgroundImageError:
                                    (exception, stackTrace) {
                                  print('Error loading image: $imageUrl');
                                },
                              )
                            : const Icon(Icons.account_circle,
                                size: 100, color: Colors.grey),
                        const SizedBox(height: 10),
                        Text(user['name'],
                            style: const TextStyle(
                                fontSize: 20, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 10),
                        ElevatedButton(
                          onPressed: () => addToContacts(user['phone']),
                          style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue),
                          child: const Text('Add to Contacts',
                              style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
