import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';
import 'audio_player_page.dart';


const String apiKey = "AIzaSyAdew4XahUvC_V2PSNIFDz6BDq7aPs5V0o";
const String baseUrl = "https://www.googleapis.com/youtube/v3/search";

class VideoSearchScreen extends StatefulWidget {
  const VideoSearchScreen({super.key});

  @override
  _VideoSearchScreenState createState() => _VideoSearchScreenState();
}

class _VideoSearchScreenState extends State<VideoSearchScreen> {
  final TextEditingController _controller = TextEditingController();
  List<dynamic> _videoResults = [];
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _searchVideos(String query) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final Uri url = Uri.parse(
        "$baseUrl?part=snippet&q=$query&type=video&maxResults=10&key=$apiKey");

    try {
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          _videoResults = data['items'];
        });
      } else {
        setState(() {
          _errorMessage = "Error fetching videos. Try again.";
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = "An error occurred: $e";
      });
    }

    setState(() {
      _isLoading = false;
    });
  }

  void _handleSearch() {
    String query = _controller.text.trim();
    if (query.isNotEmpty) {
      _searchVideos(query);
    } else {
      setState(() {
        _errorMessage = "Please enter a search term.";
      });
    }
  }

  void _openYouTube(String videoId) async {
    final Uri url = Uri.parse("https://www.youtube.com/watch?v=$videoId");
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      throw "Could not open $url";
    }
  }

  void _processVideoForAudio(String videoId, String title) async {
    // Show a dialog to confirm processing
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text("Process Recipe"),
          content: Text("Do you want to extract ingredients from \"$title\"?"),
          actions: [
            TextButton(
              child: Text("Cancel"),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
            TextButton(
              child: Text("Process"),
              onPressed: () {
                Navigator.of(context).pop();
                _startAudioProcessing(videoId, title);
              },
            ),
          ],
        );
      },
    );
  }

  Future<void> _startAudioProcessing(String videoId, String title) async {
  setState(() {
    _isLoading = true;
  });
  
  try {
    final String videoUrl = "https://www.youtube.com/watch?v=$videoId";
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("Processing video: $title"),
        duration: Duration(seconds: 2),
      ),
    );
    
    // Call your Python API
    final response = await http.post(
      Uri.parse('http://127.0.0.1:5000/download'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'youtube_url': videoUrl,
      }),
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      
      if (data['success'] == true) {
        // Process the response data
        final downloadUrl = data['download_url'];
        final serverUrl = 'http://127.0.0.1:5000';
        final fullDownloadUrl = '$serverUrl$downloadUrl';
        
        // Get the audio file content and store in memory
        final audioResponse = await http.get(Uri.parse(fullDownloadUrl));
        final audioBytes = audioResponse.bodyBytes;
        
        print("Audio downloaded to memory: ${audioBytes.length} bytes");
        
        // Navigate to the audio player page
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => AudioPlayerPage(
              audioBytes: audioBytes,
              title: title,
            ),
          ),
        );
      } else {
        throw Exception("API error: ${data['error']}");
      }
    } else {
      throw Exception("API returned status code: ${response.statusCode}");
    }
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("Error processing video: $e"),
        backgroundColor: Colors.red,
      ),
    );
    print("Error details: $e");
  } finally {
    setState(() {
      _isLoading = false;
    });
  }
}

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("CulinaryPlus")),
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          children: [
            TextField(
              controller: _controller,
              decoration: InputDecoration(
                labelText: "Search for a recipe (e.g., Cake)",
                border: OutlineInputBorder(),
                suffixIcon: IconButton(
                  icon: Icon(Icons.search),
                  onPressed: _handleSearch,
                ),
              ),
            ),
            SizedBox(height: 20),
            _isLoading
                ? Center(child: CircularProgressIndicator())
                : _errorMessage != null
                    ? Text(_errorMessage!, style: TextStyle(color: Colors.red))
                    : Expanded(
                        child: ListView.builder(
                          itemCount: _videoResults.length,
                          itemBuilder: (context, index) {
                            var video = _videoResults[index];
                            var title = video['snippet']['title'];
                            var thumbnailUrl =
                                video['snippet']['thumbnails']['medium']['url'];
                            var videoId = video['id']['videoId'];

                            return Card(
                              child: Column(
                                children: [
                                  ListTile(
                                    leading: Image.network(thumbnailUrl),
                                    title: Text(title,
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis),
                                    onTap: () {
                                      // Process the video for audio extraction
                                      _processVideoForAudio(videoId, title);
                                    },
                                  ),
                                  ButtonBar(
                                    alignment: MainAxisAlignment.spaceEvenly,
                                    children: [
                                      TextButton.icon(
                                        icon: Icon(Icons.video_library,
                                            color: Colors.red),
                                        label: Text("Watch on YouTube"),
                                        onPressed: () => _openYouTube(videoId),
                                      ),
                                      TextButton.icon(
                                        icon: Icon(Icons.restaurant_menu,
                                            color: Colors.green),
                                        label: Text("Extract Ingredients"),
                                        onPressed: () => _processVideoForAudio(videoId, title),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ],
        ),
      ),
    );
  }
}