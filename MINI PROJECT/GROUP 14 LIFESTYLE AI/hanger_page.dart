import 'package:flutter/material.dart';
import 'heart_page.dart';
import 'combinations_page.dart';

class HangerPage extends StatefulWidget {
  @override
  _HangerPageState createState() => _HangerPageState();
}

class _HangerPageState extends State<HangerPage> with SingleTickerProviderStateMixin {
  final List<String> categories = ["All", "T-Shirt", "Jacket", "Shoes", "Jeans", "Dress"];
  final List<String> outfitImages = [
    "assets/images/top/Screenshot 2025-03-31 172601.png",
    "assets/images/top/Screenshot 2025-03-31 172959.png",
    "assets/images/top/Screenshot 2025-03-31 175822.png",
    "assets/images/top/Screenshot 2025-03-31 175956.png",
    "assets/images/top/Screenshot 2025-03-31 180215.png",
    "assets/images/top/Screenshot 2025-03-31 180257.png",
    "assets/images/top/Screenshot 2025-03-31 180346.png",
    "assets/images/top/Screenshot 2025-03-31 181407.png",
    "assets/images/top/Screenshot 2025-03-31 181513.png",
    "assets/images/top/Screenshot 2025-03-31 181602.png",
    "assets/images/bottom/Screenshot 2025-03-31 180606.png",
    "assets/images/bottom/Screenshot 2025-03-31 180654.png",
    "assets/images/bottom/Screenshot 2025-03-31 180739.png",
    "assets/images/bottom/Screenshot 2025-03-31 180805.png",
    "assets/images/bottom/Screenshot 2025-03-31 180845.png",
    "assets/images/bottom/Screenshot 2025-03-31 180916.png",
    "assets/images/bottom/Screenshot 2025-03-31 180955.png",
    "assets/images/bottom/Screenshot 2025-03-31 181127.png",
    "assets/images/bottom/Screenshot 2025-03-31 181159.png",
    "assets/images/bottom/Screenshot 2025-03-31 181330.png",
  ];

  Set<String> likedOutfits = {};
  bool isExpanded = false;
  late AnimationController _controller;
  late Animation<double> _animation;
  int _selectedCategoryIndex = 0;
  bool _hasNotifications = false; // For bell icon indicator

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

  void _toggleNotification() {
    setState(() {
      _hasNotifications = !_hasNotifications;
    });
    // Add your notification logic here
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            /*Image.asset(
        'assets/images/logo.png',
        height: 30,
      ),*/
            SizedBox(width: 10),
            // Replace just the Text style with this system font alternative:
            Text(
              "LifeStyle AI", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold // This uses the system serif font
            ),
            )
          ],
        ),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: Icon(Icons.notifications_none, color: Colors.black),
                onPressed: _toggleNotification,
              ),
              if (_hasNotifications)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Category Chips
          Container(
            height: 50,
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              itemCount: categories.length,
              itemBuilder: (context, index) {
                return Padding(
                  padding: EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(categories[index]),
                    selected: _selectedCategoryIndex == index,
                    selectedColor: Colors.pink[100],
                    labelStyle: TextStyle(
                      color: _selectedCategoryIndex == index ? Colors.black : Colors.grey,
                    ),
                    onSelected: (selected) {
                      setState(() {
                        _selectedCategoryIndex = index;
                      });
                    },
                  ),
                );
              },
            ),
          ),

          // Grid View
          Expanded(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: GridView.builder(
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.7,
                ),
                itemCount: outfitImages.length,
                itemBuilder: (context, index) {
                  String imagePath = outfitImages[index];
                  bool isLiked = likedOutfits.contains(imagePath);

                  return Card(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 2,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: Image.asset(
                              imagePath,
                              fit: BoxFit.cover,
                            ),
                          ),
                          Positioned(
                            top: 8,
                            right: 8,
                            child: GestureDetector(
                              onTap: () {
                                setState(() {
                                  if (isLiked) {
                                    likedOutfits.remove(imagePath);
                                  } else {
                                    likedOutfits.add(imagePath);
                                  }
                                });
                              },
                              child: Container(
                                padding: EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.9),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  isLiked ? Icons.favorite : Icons.favorite_border,
                                  color: isLiked ? Colors.red : Colors.black,
                                  size: 20,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
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
              IconButton(
                icon: Icon(Icons.home, size: 28, color: Colors.black),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => CombinationsPage()),
                  );
                },
              ),
              GestureDetector(
                onTap: _toggleExpand,
                child: Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                      color: Colors.pink[100],
                      shape: BoxShape.rectangle,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.black, width: 2)
                  ),
                  child: Icon(Icons.add, size: 28, color: Colors.black),
                ),
              ),
              IconButton(
                icon: Icon(Icons.checkroom, size: 28, color: Colors.black),
                onPressed: () {},
              ),
              IconButton(
                icon: Icon(Icons.favorite, size: 28, color: Colors.black),
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => HeartPage(likedOutfits: likedOutfits.toList()),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: isExpanded
          ? Stack(
        alignment: Alignment.bottomCenter,
        children: [
          Positioned(
            bottom: 80,
            child: FloatingActionButton(
              backgroundColor: Colors.pink[100],
              shape: CircleBorder(),
              elevation: 0,
              onPressed: () {},
              child: Icon(Icons.camera_alt, size: 28, color: Colors.black),
            ),
          ),
          Positioned(
            bottom: 140,
            child: FloatingActionButton(
              backgroundColor: Colors.pink[100],
              shape: CircleBorder(),
              elevation: 0,
              onPressed: () {},
              child: Icon(Icons.image, size: 28, color: Colors.black),
            ),
          ),
        ],
      )
          : null,
    );
  }
}