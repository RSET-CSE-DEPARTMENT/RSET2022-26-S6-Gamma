import 'package:flutter/material.dart';
import 'combinations_page.dart'; // Import the CombinationsPage file
import 'hanger_page.dart'; // Import the HangerPage file

class HeartPage extends StatelessWidget {
  final List<String> likedOutfits;

  HeartPage({required this.likedOutfits});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [

            SizedBox(width: 8),
            Text("LifeStyle AI", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            Spacer(),
            Padding(
              padding: EdgeInsets.only(right: 21), // Moves the bell icon further right
              child: IconButton(
                icon: Icon(Icons.notifications_none, color: Colors.black),
                onPressed: () {},
              ),
            ),
          ],
        ),
      ),
      body: likedOutfits.isEmpty
          ? Center(
        child: Text(
          "No liked outfits yet!",
          style: TextStyle(fontSize: 18, color: Colors.grey),
        ),
      )
          : GridView.builder(
        padding: EdgeInsets.all(10),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 0.75,
        ),
        itemCount: likedOutfits.length,
        itemBuilder: (context, index) {
          String imagePath = likedOutfits[index];

          return Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              color: Colors.grey[200],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.asset(imagePath, fit: BoxFit.cover),
            ),
          );
        },
      ),
      bottomNavigationBar: Material(
        color: Colors.white,
        shadowColor: Colors.transparent,
        clipBehavior: Clip.none,
        child: BottomAppBar(
          shape: CircularNotchedRectangle(),
          notchMargin: 8,
          elevation: 0,
          color: Colors.white,
          child: Container(
            height: 60,
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: Icon(Icons.home, size: 28),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => CombinationsPage()),
                    );
                  },
                ),
                GestureDetector(
                  onTap: () {
                    // Your + button functionality here
                  },
                  child: Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.rectangle,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.black, width: 2),
                      color: Colors.pink[100],
                    ),
                    child: Icon(Icons.add, size: 28, color: Colors.black),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.checkroom, size: 28),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => HangerPage()),
                    );
                  },
                ),
                IconButton(
                  icon: Icon(Icons.favorite, size: 28, color: Colors.red),
                  onPressed: () {},
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}