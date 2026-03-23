import 'package:flutter/material.dart';
import 'dart:typed_data';
import 'package:audioplayers/audioplayers.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'ingredients_page.dart';

// Add to your state class
bool isProcessing = false;
String? transcriptText;

class AudioPlayerPage extends StatefulWidget {
  final Uint8List audioBytes;
  final String title;
  
  const AudioPlayerPage({
    Key? key, 
    required this.audioBytes, 
    required this.title
  }) : super(key: key);

  @override
  _AudioPlayerPageState createState() => _AudioPlayerPageState();
}

Future<String> transcribeAudio(Uint8List audioBytes) async {
  // Send the audio to local Whisper API
  return sendToLocalWhisperAPI(audioBytes);
}

Future<String> sendToLocalWhisperAPI(Uint8List audioBytes) async {
  final url = Uri.parse('http://127.0.0.1:5001/transcribe');
  
  final response = await http.post(
    url,
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'audio': base64Encode(audioBytes),
    }),
  );
  
  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    return data['text'];
  } else {
    throw Exception('Failed to transcribe audio: ${response.statusCode}, ${response.body}');
  }
}

Future<List<Map<String, dynamic>>> extractIngredients(String transcript) async {
  try {
    final url = Uri.parse('https://5999-34-142-132-29.ngrok-free.app/extract_ingredients');
    
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'transcript': transcript}),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return List<Map<String, dynamic>>.from(data['ingredients']);
    } else {
      throw Exception('Failed to extract ingredients: ${response.statusCode}');
    }
  } catch (e) {
    print('Error extracting ingredients: $e');
    throw e;
  }
}

class _AudioPlayerPageState extends State<AudioPlayerPage> {
  final AudioPlayer audioPlayer = AudioPlayer();
  bool isPlaying = false;
  Duration duration = Duration.zero;
  Duration position = Duration.zero;
  
  @override
  void initState() {
    super.initState();
    setAudio();
    
    // Listen to audio player state changes
    audioPlayer.onPlayerStateChanged.listen((state) {
      setState(() {
        isPlaying = state == PlayerState.playing;
      });
    });
    
    // Listen to duration changes
    audioPlayer.onDurationChanged.listen((newDuration) {
      setState(() {
        duration = newDuration;
      });
    });
    
    // Listen to position changes
    audioPlayer.onPositionChanged.listen((newPosition) {
      setState(() {
        position = newPosition;
      });
    });
  }
  
  @override
  void dispose() {
    audioPlayer.dispose();
    super.dispose();
  }
  
  Future<void> setAudio() async {
    // Load audio from bytes
    await audioPlayer.setSourceBytes(widget.audioBytes);
  }
  
  String formatTime(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final hours = twoDigits(duration.inHours);
    final minutes = twoDigits(duration.inMinutes.remainder(60));
    final seconds = twoDigits(duration.inSeconds.remainder(60));
    
    return [
      if (duration.inHours > 0) hours,
      minutes,
      seconds,
    ].join(':');
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Transcript Extraction'),
        leading: IconButton(
          icon: Icon(Icons.home),
          onPressed: () {
            Navigator.of(context).pop();
          },
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Text(
                  widget.title,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                SizedBox(height: 32),
                // Audio player container - fixed height
                Container(
                  decoration: BoxDecoration(
                    color: Colors.lightBlue.shade50,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  padding: EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Text(
                        'Audio Preview',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: 16),
                      // Slider
                      Slider(
                        min: 0,
                        max: duration.inSeconds.toDouble(),
                        value: position.inSeconds.toDouble(),
                        onChanged: (value) async {
                          final position = Duration(seconds: value.toInt());
                          await audioPlayer.seek(position);
                        },
                      ),
                      // Timer row
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(formatTime(position)),
                            Text(formatTime(duration)),
                          ],
                        ),
                      ),
                      SizedBox(height: 16),
                      // Play button
                      CircleAvatar(
                        radius: 35,
                        backgroundColor: Colors.blue,
                        child: IconButton(
                          icon: Icon(
                            isPlaying ? Icons.pause : Icons.play_arrow,
                            color: Colors.white,
                            size: 40,
                          ),
                          onPressed: () async {
                            if (isPlaying) {
                              await audioPlayer.pause();
                            } else {
                              await audioPlayer.resume();
                            }
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: 32),
                // Transcript container - scrollable when needed
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: isProcessing 
                    ? Center(child: CircularProgressIndicator())
                    : transcriptText != null
                      ? Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Transcript:',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(height: 8),
                            // Constrained box for transcript text to allow scrolling
                            ConstrainedBox(
                              constraints: BoxConstraints(
                                maxHeight: 200, // Set a max height for long transcripts
                              ),
                              child: SingleChildScrollView(
                                child: Text(transcriptText!),
                              ),
                            ),
                          ],
                        )
                      : Text(
                          'Click "Transcribe Audio" to get transcript',
                          style: TextStyle(
                            fontSize: 16,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                ),
                SizedBox(height: 24),
                // Buttons area - now always visible
                if (transcriptText == null)
                  ElevatedButton(
                    onPressed: () async {
                      setState(() {
                        isProcessing = true;
                      });
                      try {
                        final transcript = await transcribeAudio(widget.audioBytes);
                        setState(() {
                          transcriptText = transcript;
                          isProcessing = false;
                        });
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("Error processing audio: $e"),
                            backgroundColor: Colors.red,
                          ),
                        );
                        setState(() {
                          isProcessing = false;
                        });
                      }
                    },
                    child: Text('Transcribe Audio'),
                  ),
                if (transcriptText != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 30), // Add extra padding at bottom
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (context) => IngredientsPage(transcript: transcriptText!),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                      ),
                      child: Text('Extract Ingredients'),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}