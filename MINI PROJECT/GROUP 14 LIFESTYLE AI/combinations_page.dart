import 'package:flutter/material.dart';

class CombinationsPage extends StatelessWidget {
  final List<Map<String, String>> outfits = [
    {
      'top': 'assets/images/top/Screenshot 2025-03-31 175822.png',
      'bottom': 'assets/images/bottom/Screenshot 2025-03-31 180606.png'
    },
    {
      'top': 'assets/images/top/Screenshot 2025-03-31 181407.png',
      'bottom': 'assets/images/bottom/Screenshot 2025-03-31 180739.png'
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Text(
          "LifeStyle AI",
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.notifications, color: Colors.black),
            onPressed: () {},
          ),
        ],
      ),
      body: Column(
        children: [
          // Oval light pink button
          Padding(
            padding: EdgeInsets.only(left: 16, right: 16, top: 8, bottom: 16),
            child: ElevatedButton(
              onPressed: () {
                // Add your navigation logic here
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.pink[100], // Light pink color
                shape: StadiumBorder(), // Oval shape
                padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                elevation: 0, // No shadow
              ),
              child: Text(
                "View liked fits",
                style: TextStyle(
                  color: Colors.black,
                  fontSize: 16,
                ),
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: ListView.separated(
                itemCount: outfits.length,
                separatorBuilder: (context, index) => SizedBox(height: 20),
                itemBuilder: (context, index) {
                  return Container(
                    height: 300,
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: Colors.black,
                        width: 2.0,
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Stack(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                color: Colors.grey[100],
                                child: Image.asset(
                                  outfits[index]['top']!,
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                            Container(width: 2, color: Colors.black),
                            Expanded(
                              child: Container(
                                color: Colors.grey[100],
                                child: Image.asset(
                                  outfits[index]['bottom']!,
                                  fit: BoxFit.contain,
                                ),
                              ),
                            ),
                          ],
                        ),
                        Positioned(
                          bottom: 12,
                          right: 12,
                          child: Container(
                            padding: EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black12,
                                  blurRadius: 4,
                                )
                              ],
                            ),
                            child: Icon(
                              Icons.favorite,
                              color: Colors.red,
                              size: 24,
                            ),
                          ),
                        ),
                      ],
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
                onPressed: () {},
              ),
              GestureDetector(
                onTap: () {},
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
              IconButton(icon: Icon(Icons.checkroom, size: 28, color: Colors.black), onPressed: () {}),
              IconButton(icon: Icon(Icons.favorite_border, size: 28, color: Colors.black), onPressed: () {}),
            ],
          ),
        ),
      ),
    );
  }
}