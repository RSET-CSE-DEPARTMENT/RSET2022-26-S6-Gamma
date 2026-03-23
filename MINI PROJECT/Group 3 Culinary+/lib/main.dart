import 'package:flutter/material.dart';
import 'screens/video_search_screen.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'CulinaryPlus',
      theme: ThemeData(primarySwatch: Colors.red),
      home: VideoSearchScreen(),
    );
  }
}
