import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Non-Emergency Help',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const NonEmergencyHelp(),
    );
  }
}

// ✅ Non-Emergency Help Screen
class NonEmergencyHelp extends StatefulWidget {
  const NonEmergencyHelp({super.key});

  @override
  State<NonEmergencyHelp> createState() => _NonEmergencyHelpState();
}

class _NonEmergencyHelpState extends State<NonEmergencyHelp> {
  final List<Widget> messages = [];
  final ImagePicker _picker = ImagePicker();
  late stt.SpeechToText _speech;
  bool _isListening = false;

  // ✅ Simulated Group Members List (replace with actual group logic)
  final List<String> groupMembers = ["user1", "user2", "user3"]; // IDs or names
  final String currentUser = "user1"; // this device’s user

  @override
  void initState() {
    super.initState();
    _speech = stt.SpeechToText();
  }

  Future<void> startListening() async {
    bool available = await _speech.initialize();
    if (available) {
      _speech.listen(
        onResult: (result) {
          setState(() {
            String spokenText = result.recognizedWords;
            messages.add(Text("🗣️ $spokenText"));

            // 🔽 TODO: Send this to group chat members
            sendToGroup("🗣️ $spokenText");
          });
        },
      );
      setState(() => _isListening = true);
    }
  }

  void stopListening() {
    _speech.stop();
    setState(() => _isListening = false);
  }

  Future<void> captureImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.camera);
    if (image != null) {
      setState(() {
        Widget imgWidget = GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => FullScreenImage(imagePath: image.path),
              ),
            );
          },
          child: Image.file(File(image.path), height: 200),
        );
        messages.add(imgWidget);

        // 🔽 TODO: Send image path or data to group
        sendToGroup("[📷 Image sent]");
      });
    }
  }

  void sendToGroup(String message) {
    // ✅ Placeholder logic: send only to group members
    for (String member in groupMembers) {
      if (member != currentUser) {
        // 🔽 Replace with actual send logic (e.g., Firebase push)
        debugPrint("Sending to $member: $message");
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Non-Emergency Help")),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemCount: messages.length,
              itemBuilder: (_, index) => Padding(
                padding: const EdgeInsets.all(8.0),
                child: messages[index],
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              GestureDetector(
                onLongPressStart: (_) => startListening(),
                onLongPressEnd: (_) => stopListening(),
                child: _isListening
                    ? const Icon(Icons.hearing, size: 50, color: Colors.green)
                    : const Icon(Icons.mic, size: 50, color: Colors.red),
              ),
              IconButton(
                icon: const Icon(Icons.camera_alt, size: 50, color: Colors.blue),
                onPressed: captureImage,
              ),
              IconButton(
                icon: const Icon(Icons.clear_all, size: 50, color: Colors.grey),
                onPressed: () {
                  setState(() {
                    messages.clear();
                  });
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const NewPage()),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ✅ Full screen image viewer
class FullScreenImage extends StatelessWidget {
  final String imagePath;
  const FullScreenImage({super.key, required this.imagePath});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: () => Navigator.pop(context),
        child: Center(child: Image.file(File(imagePath))),
      ),
    );
  }
}

// ✅ Page after clearing messages
class NewPage extends StatelessWidget {
  const NewPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Page')),
      body: const Center(child: Text('This is a new blank page')),
    );
  }
}



