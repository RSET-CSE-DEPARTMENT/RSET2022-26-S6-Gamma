import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Chat',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: ChatPage(),
    );
  }
}

class ChatPage extends StatefulWidget {
  @override
  _ChatPageState createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  TextEditingController _controller = TextEditingController();
  List<String> messages = [];
  String _response = "";

  Future<void> _sendMessage() async {
    String userMessage = _controller.text;

    if (userMessage.isEmpty) return;

    setState(() {
      messages.add("You: $userMessage");
    });

    _controller.clear();

    // Prepare request data
    Map<String, dynamic> requestData = {
      'user_id': '12345', // Use dynamic user ID if needed
      'message': userMessage,
    };

    try {
      // Send the POST request to Flask API
      final response = await http.post(
        Uri.parse('http://127.0.0.1:5000/predict_context'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(requestData),
      );

      if (response.statusCode == 200) {
        // Parse response and update UI
        final responseData = json.decode(response.body);
        setState(() {
          _response = responseData['predicted_context'];
          messages.add("Assistant: $_response");
        });
      } else {
        setState(() {
          _response = "Error: Unable to get a response";
        });
      }
    } catch (e) {
      setState(() {
        _response = "Error: Network or server issue";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Chat with Assistant")),
      body: Column(
        children: <Widget>[
          Expanded(
            child: ListView.builder(
              itemCount: messages.length,
              itemBuilder: (context, index) {
                return ListTile(title: Text(messages[index]));
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: <Widget>[
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      labelText: 'Type your message...',
                    ),
                  ),
                ),
                IconButton(icon: Icon(Icons.send), onPressed: _sendMessage),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
