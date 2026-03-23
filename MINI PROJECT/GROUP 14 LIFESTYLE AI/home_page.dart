import 'package:flutter/material.dart';
import 'upload_page.dart'; // Import Upload Page

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  @override
  _HomePageState createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with SingleTickerProviderStateMixin {
  bool isExpanded = false;
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: Duration(milliseconds: 300),
      vsync: this,
    );
    _animation = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
  }

  void _toggleExpand() {
    setState(() {
      isExpanded = !isExpanded;
      if (isExpanded) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            GestureDetector(
              onTap: () {},
              child: CircleAvatar(
                backgroundColor: Colors.pink[100],
                child: Text("LS", style: TextStyle(color: Colors.brown, fontSize: 22)),
              ),
            ),
            SizedBox(width: 8),
            Text("LifeStyle AI", style: TextStyle(color: Colors.black, fontSize: 20, fontWeight: FontWeight.bold)),
            Spacer(),
            IconButton(
              icon: Icon(Icons.notifications_none, color: Colors.black, size: 32),
              onPressed: () {},
            ),
            SizedBox(width: 16),
          ],
        ),
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline, size: 60, color: Colors.grey),
          SizedBox(height: 10),
          Text("Nothing to show!", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 20),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.pink[100],
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                padding: EdgeInsets.symmetric(vertical: 12, horizontal: 30),
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => UploadPage()),
                );
              },
              child: Text("Add your first fit", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ),
          SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 40),
            child: Text(
              "Unlock personalized style suggestions by adding at least 5 outfits from your wardrobe.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomAppBar(
        shape: CircularNotchedRectangle(),
        notchMargin: 8,
        child: Container(
          height: 60,
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(icon: Icon(Icons.home, size: 28), onPressed: () {}),
              GestureDetector(
                onTap: _toggleExpand,
                child: Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    shape: BoxShape.rectangle,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.black, width: 2),
                  ),
                  child: Icon(Icons.add, size: 28, color: Colors.black),
                ),
              ),
              IconButton(icon: Icon(Icons.checkroom, size: 28), onPressed: () {}),
              IconButton(icon: Icon(Icons.favorite_border, size: 28), onPressed: () {}),
            ],
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          Positioned(
            bottom: _animation.value * 80 + 10,
            left: MediaQuery.of(context).size.width / 2 - 35,
            child: Opacity(
              opacity: _animation.value,
              child: FloatingActionButton(
                backgroundColor: Colors.pink[100],
                shape: CircleBorder(),
                elevation: 0,
                onPressed: () {},
                child: Icon(Icons.camera_alt, size: 28, color: Colors.black),
              ),
            ),
          ),
          Positioned(
            bottom: _animation.value * 140 + 20,
            left: MediaQuery.of(context).size.width / 2 - 35,
            child: Opacity(
              opacity: _animation.value,
              child: FloatingActionButton(
                backgroundColor: Colors.pink[100],
                shape: CircleBorder(),
                elevation: 0,
                onPressed: () {},
                child: Icon(Icons.image, size: 28, color: Colors.black),
              ),
            ),
          ),
        ],
      ),
    );
  }
}