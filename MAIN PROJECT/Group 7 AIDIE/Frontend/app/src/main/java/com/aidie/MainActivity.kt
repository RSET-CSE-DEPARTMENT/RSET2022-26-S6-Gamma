package com.aidie

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.navigation.NavController
import kotlinx.coroutines.delay
import android.content.Intent
import com.aidie.ui.emotion.EmotionDebugActivity
import com.aidie.ui.emotion.EmotionDebugScreen


// -------------------- Navigation enum --------------------

enum class AppScreen {
    LOGIN,
    CHILD_HOME,
    PARENT_HOME,
    EMOTION_DEBUG,

    // Child detail screens
    CHILD_MINDFULNESS,
    CHILD_TASK_TIME,
    CHILD_SESSIONS,

    CHILD_ACHIEVEMENTS,
    CHILD_MOOD_METER,

    // Parent detail screens
    PARENT_ACADEMIC_PERFORMANCE,
    PARENT_SKILL_DEVELOPMENT,
    PARENT_TODAYS_HIGHLIGHTS,
    PARENT_TASKS,
    PARENT_ENGAGEMENT_LEVELS,
    PARENT_UPDATE_SCHEDULE,
    PARENT_MOOD_METER
}

// -------------------- Activity --------------------

class MainActivity : ComponentActivity() {
    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var currentScreen by remember { mutableStateOf(AppScreen.LOGIN) }

            MaterialTheme {
                Surface {
                    when (currentScreen) {
                        AppScreen.LOGIN -> LoginScreen(
                            onChildLogin = { currentScreen = AppScreen.CHILD_HOME },
                            onParentLogin = { currentScreen = AppScreen.PARENT_HOME }
                        )

                        // Child flow
                        AppScreen.CHILD_HOME -> ChildHomeScreen(
                            onUpdateScreen = { currentScreen = it },
                            onMindfulnessClick = { currentScreen = AppScreen.CHILD_MINDFULNESS },
                            onTaskTimeClick = { currentScreen = AppScreen.CHILD_TASK_TIME },
                            onMoodMeterClick = { currentScreen = AppScreen.CHILD_MOOD_METER }
                        )


                        AppScreen.CHILD_SESSIONS -> ChildSessionsScreen(
                            onBack = { currentScreen = AppScreen.CHILD_HOME }
                        )
                        AppScreen.CHILD_ACHIEVEMENTS -> ChildAchievementsScreen(
                            onBack = { currentScreen = AppScreen.CHILD_HOME }
                        )
                        AppScreen.CHILD_MINDFULNESS -> MindfulnessScreen(
                            onBack = { currentScreen = AppScreen.CHILD_HOME }
                        )
                        AppScreen.CHILD_TASK_TIME -> TaskTimeScreen(
                            onBack = { currentScreen = AppScreen.CHILD_HOME }
                        )
                        AppScreen.CHILD_MOOD_METER -> ChildMoodMeterScreen(
                            onBack = { currentScreen = AppScreen.CHILD_HOME }
                        )
                        AppScreen.EMOTION_DEBUG -> EmotionDebugScreen(onBack = { currentScreen = AppScreen.CHILD_HOME })
                    // Parent flow
                        AppScreen.PARENT_HOME -> ParentTeacherHomeScreen(
                            onAcademicClick = { currentScreen = AppScreen.PARENT_ACADEMIC_PERFORMANCE },
                            onSkillClick = { currentScreen = AppScreen.PARENT_SKILL_DEVELOPMENT },
                            onHighlightsClick = { currentScreen = AppScreen.PARENT_TODAYS_HIGHLIGHTS },
                            onTasksClick = { currentScreen = AppScreen.PARENT_TASKS },
                            onEngagementClick = { currentScreen = AppScreen.PARENT_ENGAGEMENT_LEVELS },
                            onUpdateScheduleClick = { currentScreen = AppScreen.PARENT_UPDATE_SCHEDULE },
                            onMoodMeterClick = { currentScreen = AppScreen.PARENT_MOOD_METER }
                        )
                        AppScreen.PARENT_ACADEMIC_PERFORMANCE -> AcademicPerformanceScreen(
                            onBack = { currentScreen = AppScreen.PARENT_HOME }
                        )
                        AppScreen.PARENT_SKILL_DEVELOPMENT -> SkillDevelopmentScreen(
                            onBack = { currentScreen = AppScreen.PARENT_HOME }
                        )
                        AppScreen.PARENT_TODAYS_HIGHLIGHTS -> TodaysHighlightsScreen(
                            onBack = { currentScreen = AppScreen.PARENT_HOME }
                        )
                        AppScreen.PARENT_TASKS -> ParentTasksScreen(
                            onBack = { currentScreen = AppScreen.PARENT_HOME }
                        )
                        AppScreen.PARENT_ENGAGEMENT_LEVELS -> EngagementLevelsScreen(
                            onBack = { currentScreen = AppScreen.PARENT_HOME }
                        )
                        AppScreen.PARENT_UPDATE_SCHEDULE -> UpdateScheduleScreen(
                            onBack = { currentScreen = AppScreen.PARENT_HOME }
                        )
                        AppScreen.PARENT_MOOD_METER -> ParentMoodMeterScreen(
                            onBack = { currentScreen = AppScreen.PARENT_HOME }
                        )
                    }
                }
            }
        }
    }
}

// -------------------- Login --------------------

@Composable
fun LoginScreen(
    onChildLogin: () -> Unit,
    onParentLogin: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF3CBC5)),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(32.dp))

        Image(
            painter = painterResource(id = R.drawable.aidie),
            contentDescription = "Aidie Logo",
            modifier = Modifier
                .size(160.dp)
                .padding(16.dp)
        )
        Spacer(modifier = Modifier.height(8.dp))

        Text(
            "Welcome to Your Learning Adventure!",
            fontWeight = FontWeight.Bold,
            fontSize = 20.sp,
            modifier = Modifier.padding(top = 8.dp)
        )
        Text(
            "Grow your Way!",
            fontSize = 16.sp,
            modifier = Modifier.padding(bottom = 24.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            LoginCard(
                title = "Children's Login",
                hint1 = "Username",
                hint2 = "Password",
                icon = Icons.Default.Person,
                onLogin = onChildLogin
            )
            LoginCard(
                title = "Parent/Teacher Login",
                hint1 = "Email",
                hint2 = "Password",
                icon = Icons.Default.School,
                onLogin = onParentLogin
            )
        }
        Spacer(modifier = Modifier.weight(1f))
        BottomNavBar()
    }
}

@Composable
fun LoginCard(
    title: String,
    hint1: String,
    hint2: String,
    icon: ImageVector,
    onLogin: () -> Unit
) {
    Card(
        modifier = Modifier
            .width(190.dp)
            .padding(8.dp),
        elevation = CardDefaults.cardElevation(4.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFF6F8FD))
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalAlignment = Alignment.Start
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null)
                Spacer(modifier = Modifier.width(6.dp))
                Text(title, fontWeight = FontWeight.Bold)
            }
            Text(
                text = "Enter your information below:",
                fontSize = 12.sp,
                modifier = Modifier.padding(vertical = 8.dp)
            )
            OutlinedTextField(value = "", onValueChange = {}, label = { Text(hint1) })
            OutlinedTextField(
                value = "",
                onValueChange = {},
                label = { Text(hint2) },
                visualTransformation = PasswordVisualTransformation()
            )
            Button(
                onClick = onLogin,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color.Black)
            ) {
                Text("Login", color = Color.White)
            }
        }
    }
}

@Composable
fun BottomNavBar() {
    Row(
        Modifier
            .fillMaxWidth()
            .height(54.dp)
            .background(Color(0xFFE5E8FD)),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.Star, contentDescription = "Star", modifier = Modifier.size(28.dp), tint = Color(0xFFFED500))
        Icon(Icons.Default.EmojiEvents, contentDescription = "Trophy", modifier = Modifier.size(28.dp), tint = Color(0xFF547BFD))
        Icon(Icons.Default.Favorite, contentDescription = "Favorite", modifier = Modifier.size(28.dp), tint = Color(0xFFFF5656))
    }
}

// -------------------- Child home --------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChildHomeScreen(
    onUpdateScreen: (AppScreen) -> Unit,
    onMindfulnessClick: () -> Unit,
    onTaskTimeClick: () -> Unit,
    onMoodMeterClick: () -> Unit
) {
    var points by remember { mutableStateOf(0) }
    var achievements by remember { mutableStateOf(listOf<String>()) }
    var tasksCompleted by remember { mutableStateOf(0) }
    var lastRewardMessage by remember { mutableStateOf("") }

    val scale = remember { Animatable(1f) }
    val coroutineScope = rememberCoroutineScope()

    suspend fun animatePoints() {
        scale.animateTo(
            targetValue = 1.5f,
            animationSpec = tween(durationMillis = 300)
        )
        scale.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 300)
        )
    }

    fun completeTask() {
        points += 10
        tasksCompleted += 1
        if (tasksCompleted == 1) {
            achievements = achievements + "First Task Completed!"
        }
        if (points >= 50 && !achievements.contains("Level Up!")) {
            achievements = achievements + "Level Up!"
        }
        lastRewardMessage = "🎉 You earned 10 points!"
        coroutineScope.launch { animatePoints() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFB99874))
    ) {
        TopAppBar(
            title = { Text("Home", color = Color.Black) },
            navigationIcon = { Icon(Icons.Default.Home, contentDescription = null) }
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Gamification card
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier.padding(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    "Points: $points",
                    fontWeight = FontWeight.Bold,
                    fontSize = 22.sp,
                    modifier = Modifier.scale(scale.value)
                )
                if (achievements.isNotEmpty()) {
                    Text("Achievements:", fontWeight = FontWeight.SemiBold)
                    achievements.forEach { Text("🏆 $it", fontSize = 14.sp) }
                }
                Spacer(Modifier.height(8.dp))
                Button(onClick = { onUpdateScreen(AppScreen.CHILD_ACHIEVEMENTS) }) {
                    Text("View Achievements")
                }
            }
        }

        // Mood meter card – tap anywhere to open mood screen
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clickable { onMoodMeterClick() }
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(
                    horizontalArrangement = Arrangement.SpaceAround,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    listOf("👍", "❤️", "😂", "😊", "😟", "😡").forEach { emoji ->
                        Button(
                            onClick = { /* handle mood */ },
                            shape = CircleShape,
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White)
                        ) {
                            Text(emoji, fontSize = 28.sp)
                        }
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Mood Meter")
                    Button(
                        onClick = { /* rewards */ },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Black)
                    ) {
                        Text("Rewards", color = Color.White)
                    }
                }
                Text("5 minutes   4.8/5")
            }
        }

        // Activities
        Text("Activities", modifier = Modifier.padding(start = 18.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            ActivityCard("Mindfulness", Icons.Default.SelfImprovement, onClick = onMindfulnessClick)
            ActivityCard("Task Time", Icons.Default.Schedule, onClick = onTaskTimeClick)
        }
        Spacer(Modifier.height(18.dp))

        // Study session - EMOTION BUTTON ✅ FIXED
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text("Study Session")
                LinearProgressIndicator(
                    progress = { 0.25f },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .padding(vertical = 8.dp)
                )

                // ✅ FIXED EMOTION BUTTON
                Button(
                    onClick = { onUpdateScreen(AppScreen.EMOTION_DEBUG) },  // ✅ PERFECT!
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                ) {
                    Text("🤖 Check My Focus", color = Color.White)
                }

                Button(
                    onClick = { completeTask() },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Black)
                ) {
                    Text("Complete Task +10 Points", color = Color.White)
                }
                if (lastRewardMessage.isNotEmpty()) {
                    Text(
                        lastRewardMessage,
                        color = Color(0xFF3CB371),
                        fontWeight = FontWeight.Bold
                    )
                }
                Button(
                    onClick = { onUpdateScreen(AppScreen.CHILD_SESSIONS) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 6.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.DarkGray) // ✅ Original dark gray
                ) {
                    Text("View All Sessions", color = Color.White)                }
            }
        }
    }
}
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChildSessionsScreen(onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Color(0xFFB99874))) { // ✅ Original brown/orange
        TopAppBar(
            title = { Text("📋 All Sessions") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, null)
                }
            }
        )
        Column(
            Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            listOf(
                "📖 Math - 25min ⭐⭐⭐⭐",
                "✏️ Reading - 15min ⭐⭐⭐",
                "🧮 Quiz - Pending",
                "🎨 Art - 30min ⭐⭐⭐⭐⭐"
            ).forEach {
                Card(Modifier.fillMaxWidth(), elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)) {
                    Text(it, Modifier.padding(16.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChildAchievementsScreen(onBack: () -> Unit) {
    Column(Modifier.fillMaxSize().background(Color(0xFFB99874))) { // ✅ Original brown/orange
        TopAppBar(
            title = { Text("🏆 Achievements") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, null)
                }
            }
        )
        Column(
            Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            listOf("First Task! 🎉", "50 Points!", "Level Up! 🚀", "Perfect Day!", "5 Sessions!").forEach {
                Card(
                    Modifier.fillMaxWidth(),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Row(
                        Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {

                        Spacer(Modifier.width(12.dp))
                        Text(it, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

// -------------------- Parent home --------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParentTeacherHomeScreen(
    onAcademicClick: () -> Unit,
    onSkillClick: () -> Unit,
    onHighlightsClick: () -> Unit,
    onTasksClick: () -> Unit,
    onEngagementClick: () -> Unit,
    onUpdateScheduleClick: () -> Unit,
    onMoodMeterClick: () -> Unit
) {
    Column(
        Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FA))
            .padding(16.dp)
    ) {
        TopAppBar(
            title = { Text("Parent/Teacher Home") },
            actions = { Icon(Icons.Default.Person, contentDescription = null) }
        )
        Spacer(modifier = Modifier.height(8.dp))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            OverviewCard("Academic Performance", R.drawable.barchart, onClick = onAcademicClick)
            OverviewCard("Skill Development", R.drawable.pie, onClick = onSkillClick)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            OverviewCard("Today's Highlights", R.drawable.linegraph, onClick = onHighlightsClick)
            OverviewCard("Tasks", R.drawable.task, onClick = onTasksClick)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
            OverviewCard("Engagement Levels", R.drawable.egagement, onClick = onEngagementClick)
            OverviewCard("Update/Modify Schedule", R.drawable.schedule, onClick = onUpdateScheduleClick)
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            OverviewCard("Mood Meter", R.drawable.smile, onClick = onMoodMeterClick)
        }
        Spacer(modifier = Modifier.weight(1f))
        Row(
            Modifier
                .fillMaxWidth()
                .background(Color(0xFFDEE6F3)),
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            IconButton(onClick = {}) { Icon(Icons.Default.Home, contentDescription = "Home") }
            IconButton(onClick = {}) { Icon(Icons.Default.Assessment, contentDescription = "Report") }
            IconButton(onClick = {}) { Icon(Icons.Default.Person, contentDescription = "Profile") }
            IconButton(onClick = {}) { Icon(Icons.Default.Settings, contentDescription = "Settings") }
        }
    }
}

@Composable
fun OverviewCard(title: String, imageRes: Int, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .width(160.dp)
            .height(110.dp)
            .padding(4.dp)
            .clickable { onClick() },
        elevation = CardDefaults.cardElevation()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            verticalArrangement = Arrangement.SpaceEvenly,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Image(
                painter = painterResource(id = imageRes),
                contentDescription = title,
                modifier = Modifier.size(40.dp)
            )
            Text(
                title,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                softWrap = true
            )
        }
    }
}

// -------------------- Shared small components --------------------

@Composable
fun ActivityCard(
    title: String,
    icon: ImageVector,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .padding(8.dp)
            .clickable { onClick() },
        elevation = CardDefaults.cardElevation(4.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(icon, contentDescription = title)
            Text(title)
        }
    }
}

// -------------------- Child detail screens --------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GamesScreen(onBack: () -> Unit) {
    SimpleScaffoldScreen("Games", "Games content goes here", onBack)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MindfulnessScreen(onBack: () -> Unit) {
    // Simple state: selected activity and mini-timer
    val activities = listOf("Breathing", "Body Scan", "5-4-3-2-1 Senses")
    var selectedActivity by remember { mutableStateOf(activities[0]) }

    var isRunning by remember { mutableStateOf(false) }
    var remainingSeconds by remember { mutableStateOf(30) } // 30-second micro-activity
    var beforeMood by remember { mutableStateOf<String?>(null) }
    var afterMood by remember { mutableStateOf<String?>(null) }

    // Mini timer
    LaunchedEffect(isRunning, remainingSeconds) {
        if (isRunning && remainingSeconds > 0) {
            delay(1000)
            remainingSeconds -= 1
        }
        if (remainingSeconds == 0 && isRunning) {
            isRunning = false
        }
    }

    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val progress = remainingSeconds / 30f

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF3F6FF))
    ) {
        TopAppBar(
            title = { Text("Mindfulness") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Take a quick calm break", fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Spacer(Modifier.height(12.dp))

            // Mood before
            Text("How do you feel right now?", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                modifier = Modifier.fillMaxWidth()
            ) {
                listOf("😟", "😐", "😊").forEach { emoji ->
                    val selected = beforeMood == emoji
                    Button(
                        onClick = { beforeMood = emoji },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (selected) Color(0xFF4CAF50) else Color.White,
                            contentColor = if (selected) Color.White else Color.Black
                        )
                    ) {
                        Text(emoji, fontSize = 22.sp)
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // Activity selector
            Text("Choose an activity", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                activities.forEach { name ->
                    val selected = name == selectedActivity
                    Button(
                        onClick = {
                            selectedActivity = name
                            isRunning = false
                            remainingSeconds = 30
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (selected) Color(0xFF4CAF50) else Color(0xFFE0E0E0),
                            contentColor = if (selected) Color.White else Color.Black
                        )
                    ) {
                        Text(name, fontSize = 12.sp)
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // Instructions for current activity
            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        when (selectedActivity) {
                            "Breathing" -> "Breathe in slowly while you count to 4. Hold for 2. Breathe out for 4."
                            "Body Scan" -> "Notice your feet, legs, tummy, hands, shoulders, and face. Relax each part gently."
                            else -> "Look: 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you like."
                        },
                        fontSize = 14.sp
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            // Mini timer for the exercise
            Text(
                String.format("%02d:%02d", minutes, seconds),
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(10.dp),
                color = Color(0xFF4CAF50),
                trackColor = Color(0xFFE0E0E0)
            )

            Spacer(Modifier.height(12.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = {
                        isRunning = !isRunning
                    },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isRunning) Color(0xFFFFA000) else Color(0xFF4CAF50),
                        contentColor = Color.White
                    )
                ) {
                    Text(if (isRunning) "Pause" else "Start")
                }
                OutlinedButton(
                    onClick = {
                        isRunning = false
                        remainingSeconds = 30
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Reset")
                }
            }

            Spacer(Modifier.height(20.dp))

            // Mood after
            Text("How do you feel now?", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                modifier = Modifier.fillMaxWidth()
            ) {
                listOf("😟", "😐", "😊").forEach { emoji ->
                    val selected = afterMood == emoji
                    Button(
                        onClick = { afterMood = emoji },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (selected) Color(0xFF4CAF50) else Color.White,
                            contentColor = if (selected) Color.White else Color.Black
                        )
                    ) {
                        Text(emoji, fontSize = 22.sp)
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            Text(
                "Use a quick calm break whenever you feel overwhelmed.",
                fontSize = 13.sp
            )
        }
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TaskTimeScreen(onBack: () -> Unit) {
    val presetMinutes = listOf(5, 10, 15)

    var selectedMinutes by remember { mutableStateOf(15) }
    val totalSeconds = selectedMinutes * 60

    var remainingSeconds by remember { mutableStateOf(totalSeconds) }
    var isRunning by remember { mutableStateOf(false) }
    var taskName by remember { mutableStateOf("Homework") }
    var showCelebration by remember { mutableStateOf(false) }

    // Animation for celebration text
    val celebrationScale = remember { androidx.compose.animation.core.Animatable(1f) }
    val coroutineScope = rememberCoroutineScope()

    suspend fun runCelebrationAnimation() {
        celebrationScale.snapTo(1f)
        celebrationScale.animateTo(
            1.3f,
            animationSpec = tween(durationMillis = 200)
        )
        celebrationScale.animateTo(
            1f,
            animationSpec = tween(durationMillis = 200)
        )
    }

    LaunchedEffect(selectedMinutes) {
        if (!isRunning) {
            remainingSeconds = selectedMinutes * 60
            showCelebration = false
        }
    }

    LaunchedEffect(isRunning, remainingSeconds) {
        if (isRunning && remainingSeconds > 0) {
            delay(1000)
            remainingSeconds -= 1
        }
        if (remainingSeconds == 0 && isRunning) {
            isRunning = false
            showCelebration = true
            coroutineScope.launch { runCelebrationAnimation() }
        }
    }

    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val progress =
        if (totalSeconds == 0) 0f else remainingSeconds.toFloat() / totalSeconds.toFloat()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FA))
    ) {
        TopAppBar(
            title = { Text("Task Time") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("Focus on one task", fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = taskName,
                onValueChange = {
                    taskName = it
                    showCelebration = false
                },
                label = { Text("Task name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(Modifier.height(16.dp))

            Text("Choose time", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                presetMinutes.forEach { minutesOption ->
                    val isSelected = minutesOption == selectedMinutes
                    Button(
                        onClick = {
                            selectedMinutes = minutesOption
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (isSelected) Color(0xFF4CAF50) else Color(0xFFE0E0E0),
                            contentColor = if (isSelected) Color.White else Color.Black
                        )
                    ) {
                        Text("$minutesOption min")
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            Text(
                String.format("%02d:%02d", minutes, seconds),
                fontSize = 48.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF212121)
            )

            Spacer(Modifier.height(16.dp))

            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(12.dp),
                color = Color(0xFF4CAF50),
                trackColor = Color(0xFFE0E0E0)
            )

            Spacer(Modifier.height(24.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Button(
                    onClick = {
                        showCelebration = false
                        isRunning = !isRunning
                    },
                    modifier = Modifier.weight(1f),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isRunning) Color(0xFFFFA000) else Color(0xFF4CAF50),
                        contentColor = Color.White
                    )
                ) {
                    Text(if (isRunning) "Pause" else "Start")
                }
                OutlinedButton(
                    onClick = {
                        isRunning = false
                        remainingSeconds = selectedMinutes * 60
                        showCelebration = false
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Reset")
                }
            }

            Spacer(Modifier.height(24.dp))

            if (showCelebration) {
                Text(
                    text = "Great job finishing your task block! 🎉",
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF2E7D32),
                    modifier = Modifier.scale(celebrationScale.value)
                )
            } else {
                Text(
                    "Tip: Work for one block, then take a short fun break.",
                    fontSize = 14.sp
                )
            }
        }
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChildMoodMeterScreen(onBack: () -> Unit) {
    data class MoodOption(val emoji: String, val label: String)

    val moods = listOf(
        MoodOption("😄", "Happy"),
        MoodOption("🤩", "Excited"),
        MoodOption("🙂", "Calm"),
        MoodOption("😟", "Worried"),
        MoodOption("😢", "Sad"),
        MoodOption("😡", "Angry")
    )

    data class MoodEntry(val emoji: String, val label: String)

    var selectedMood by remember { mutableStateOf<MoodOption?>(null) }
    var lastEntries by remember { mutableStateOf(listOf<MoodEntry>()) }
    var points by remember { mutableStateOf(0) }
    var feedbackText by remember { mutableStateOf("How do you feel right now?") }

    // Simple scale animation when mood is saved
    val scale = remember { androidx.compose.animation.core.Animatable(1f) }
    val scope = rememberCoroutineScope()

    suspend fun runSaveAnimation() {
        scale.animateTo(
            1.15f,
            animationSpec = tween(durationMillis = 150)
        )
        scale.animateTo(
            1f,
            animationSpec = tween(durationMillis = 150)
        )
    }

    fun saveMood(mood: MoodOption) {
        selectedMood = mood
        points += 2
        lastEntries = (listOf(MoodEntry(mood.emoji, mood.label)) + lastEntries).take(3)
        feedbackText = "Thanks for sharing! You earned 2 points."
        scope.launch { runSaveAnimation() }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF3F6FF))
    ) {
        TopAppBar(
            title = { Text("Mood Meter") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                feedbackText,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                modifier = Modifier.scale(scale.value)
            )
            Spacer(Modifier.height(8.dp))
            Text(
                "Tap a face that matches how you feel.",
                fontSize = 13.sp,
                color = Color.Gray
            )

            Spacer(Modifier.height(24.dp))

            // Emoji grid
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Row(
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    moods.take(3).forEach { mood ->
                        Button(
                            onClick = { saveMood(mood) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                            modifier = Modifier.size(80.dp),
                            shape = CircleShape,
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                        ) {
                            Text(mood.emoji, fontSize = 36.sp)
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
                Row(
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    moods.drop(3).forEach { mood ->
                        Button(
                            onClick = { saveMood(mood) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                            modifier = Modifier.size(80.dp),
                            shape = CircleShape,
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                        ) {
                            Text(mood.emoji, fontSize = 36.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // Points card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF9C4))
            ) {
                Column(
                    modifier = Modifier.padding(12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Mood points", fontWeight = FontWeight.SemiBold)
                    Text("$points", fontSize = 24.sp, fontWeight = FontWeight.Bold)
                    Text(
                        "Share your feelings each day to collect more points.",
                        fontSize = 12.sp
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Recent moods
            Text("Recent moods", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            if (lastEntries.isEmpty()) {
                Text(
                    "Your last moods will show here after a few check‑ins.",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
            } else {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    lastEntries.forEach { entry ->
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column(
                                modifier = Modifier
                                    .padding(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(entry.emoji, fontSize = 24.sp)
                                Text(entry.label, fontSize = 12.sp)
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            Text(
                "All feelings are okay. If you tap a worried, sad, or angry face, you can ask an adult for help.",
                fontSize = 11.sp,
                color = Color.Gray
            )
        }
    }
}


// -------------------- Parent detail screens --------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AcademicPerformanceScreen(onBack: () -> Unit) {
    // Simple models – later replace with real data
    data class SubjectPerformance(
        val name: String,
        val icon: ImageVector,
        val scorePercent: Int,      // 0–100
        val targetPercent: Int,     // class/goal
        val trend: Int,             // +1 improving, 0 stable, -1 down
        val missingAssignments: Int,
        val lastTestLabel: String
    )

    data class Assessment(
        val title: String,
        val subject: String,
        val scoreText: String,
        val isLow: Boolean
    )

    val subjects = listOf(
        SubjectPerformance(
            "Math", Icons.Default.Calculate, 78, 85, +1, 1, "Quiz: 18/20"
        ),
        SubjectPerformance(
            "English", Icons.Default.MenuBook, 84, 85, 0, 0, "Reading: 16/20"
        ),
        SubjectPerformance(
            "Science", Icons.Default.Biotech, 72, 80, -1, 2, "Lab: 14/25"
        )
    )

    val assessments = listOf(
        Assessment("Math Quiz", "Math", "18 / 20", false),
        Assessment("Science Lab", "Science", "14 / 25", true),
        Assessment("Reading Comprehension", "Language", "12 / 20", true)
    )

    val overallPercent =  (subjects.sumOf { it.scorePercent } / subjects.size)
    val attendancePercent = 92
    val onTimePercent = 80

    val trendLabel: String
    val trendColor: Color
    when {
        subjects.count { it.trend > 0 } > subjects.count { it.trend < 0 } -> {
            trendLabel = "Improving"
            trendColor = Color(0xFF66BB6A)
        }
        subjects.any { it.trend < 0 } -> {
            trendLabel = "Some decline"
            trendColor = Color(0xFFFFCA28)
        }
        else -> {
            trendLabel = "Stable"
            trendColor = Color(0xFF9E9E9E)
        }
    }

    fun trendText(trend: Int): String = when {
        trend > 0 -> "Improving"
        trend < 0 -> "Needs attention"
        else -> "Stable"
    }

    fun trendColorFor(trend: Int): Color = when {
        trend > 0 -> Color(0xFF66BB6A)
        trend < 0 -> Color(0xFFEF5350)
        else -> Color(0xFF9E9E9E)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FA))
    ) {
        TopAppBar(
            title = { Text("Academic Performance") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Overall summary
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Overall progress", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Overall score: $overallPercent%",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            color = trendColor.copy(alpha = 0.15f),
                            shape = CircleShape
                        ) {
                            Text(
                                trendLabel,
                                color = trendColor,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "Attendance: $attendancePercent% • On‑time work: $onTimePercent%",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Stronger areas: English, Extra support needed in Science and some Math topics.",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Subjects
            Text("By subject", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))

            subjects.forEach { subject ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                subject.icon,
                                contentDescription = subject.name,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(subject.name, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${subject.scorePercent}% (target ${subject.targetPercent}%)",
                                    fontSize = 12.sp
                                )
                            }
                            Surface(
                                color = trendColorFor(subject.trend).copy(alpha = 0.15f),
                                shape = CircleShape
                            ) {
                                Text(
                                    trendText(subject.trend),
                                    fontSize = 11.sp,
                                    color = trendColorFor(subject.trend),
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }

                        Spacer(Modifier.height(8.dp))
                        LinearProgressIndicator(
                            progress = {
                                subject.scorePercent / 100f
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp),
                            color = Color(0xFF42A5F5),
                            trackColor = Color(0xFFE0E0E0)
                        )

                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = subject.lastTestLabel +
                                    if (subject.missingAssignments > 0)
                                        " • ${subject.missingAssignments} missing assignments"
                                    else
                                        " • On track with work",
                            fontSize = 12.sp,
                            color = Color.Gray
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Recent assessments
            Text("Recent results", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))

            assessments.forEach { item ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 3.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (item.isLow) Color(0xFFFFEBEE) else Color.White
                    )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(item.title, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                            Text(item.subject, fontSize = 12.sp, color = Color.Gray)
                        }
                        Text(
                            item.scoreText,
                            fontSize = 13.sp,
                            color = if (item.isLow) Color(0xFFEF5350) else Color(0xFF2E7D32)
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            OutlinedButton(
                onClick = {
                    // Later: navigate to tasks/schedule filtered for weak subjects
                    // e.g. onPlanPractice()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.School, contentDescription = "Plan practice")
                Spacer(Modifier.width(8.dp))
                Text("Plan practice for weak areas")
            }
        }
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SkillDevelopmentScreen(onBack: () -> Unit) {
    // Simple model for skills
    data class SkillInfo(
        val name: String,
        val icon: ImageVector,
        val level: Int,
        val levelChange: Int,      // +1, 0, -1
        val sessionsThisWeek: Int,
        val minutesThisWeek: Int
    )

    val skills = listOf(
        SkillInfo("Focus", Icons.Default.Visibility, 3, +1, 4, 35),
        SkillInfo("Organization", Icons.Default.List, 2, 0, 2, 20),
        SkillInfo("Task Completion", Icons.Default.CheckCircle, 3, +1, 5, 40),
        SkillInfo("Emotional Regulation", Icons.Default.FavoriteBorder, 2, 0, 3, 25),
        SkillInfo("Social Skills", Icons.Default.Groups, 1, -1, 1, 10)
    )

    var selectedSkill by remember { mutableStateOf(skills.first()) }

    fun levelLabel(change: Int): String = when {
        change > 0 -> "Improving"
        change < 0 -> "Needs attention"
        else -> "Stable"
    }

    fun levelColor(change: Int): Color = when {
        change > 0 -> Color(0xFF66BB6A)
        change < 0 -> Color(0xFFEF5350)
        else -> Color(0xFF9E9E9E)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FA))
    ) {
        TopAppBar(
            title = { Text("Skill Development") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Overall summary
            val improvingCount = skills.count { it.levelChange > 0 }
            val watchCount = skills.count { it.levelChange < 0 }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        "Overview",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Skills improving: $improvingCount • Skills to watch: $watchCount",
                        fontSize = 14.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Most growth this week: Focus and Task Completion.",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            Text("Core skills", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))

            // Skill cards
            Column {
                skills.forEach { skill ->
                    val isSelected = skill.name == selectedSkill.name
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clickable { selectedSkill = skill },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) Color(0xFFE3F2FD) else Color.White
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                skill.icon,
                                contentDescription = skill.name,
                                tint = Color(0xFF424242),
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(skill.name, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "Level ${skill.level}",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                                Text(
                                    "This week: ${skill.sessionsThisWeek} sessions • ${skill.minutesThisWeek} min",
                                    fontSize = 12.sp
                                )
                            }
                            Surface(
                                color = levelColor(skill.levelChange).copy(alpha = 0.12f),
                                shape = CircleShape
                            ) {
                                Text(
                                    levelLabel(skill.levelChange),
                                    color = levelColor(skill.levelChange),
                                    fontSize = 11.sp,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Selected skill detail
            Text("Details", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFFFF))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        selectedSkill.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Current level: ${selectedSkill.level} • Status: ${levelLabel(selectedSkill.levelChange)}",
                        fontSize = 13.sp
                    )
                    Spacer(Modifier.height(8.dp))

                    // Simple text trend + related activities
                    val trendText = when (selectedSkill.name) {
                        "Focus" -> "Able to stay on a single task for longer stretches, especially during Task Time."
                        "Organization" -> "Getting more consistent with following the planned schedule and finishing steps."
                        "Task Completion" -> "Completing more assigned tasks and study blocks this week."
                        "Emotional Regulation" -> "Using calm‑down strategies like Mindfulness when feeling upset."
                        "Social Skills" -> "Practicing turn‑taking and sharing during games."
                        else -> "Steady progress over the last few days."
                    }
                    Text(trendText, fontSize = 13.sp)

                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Related activities:",
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    val related = when (selectedSkill.name) {
                        "Focus" -> listOf("Task Time", "Focus games")
                        "Organization" -> listOf("Update Schedule", "Task lists")
                        "Task Completion" -> listOf("Study sessions", "Rewards for finished tasks")
                        "Emotional Regulation" -> listOf("Mindfulness", "Mood Meter check‑ins")
                        "Social Skills" -> listOf("Co‑op games", "Group tasks")
                        else -> emptyList()
                    }
                    related.forEach { item ->
                        Text("• $item", fontSize = 12.sp)
                    }

                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Parent tip: Keep sessions short and positive. Notice and praise small wins related to this skill.",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            OutlinedButton(
                onClick = {
                    // Later: navigate to schedule or tasks filtered by selectedSkill
                    // e.g. onPlanActivities(selectedSkill)
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Schedule, contentDescription = "Plan activities")
                Spacer(Modifier.width(8.dp))
                Text("Plan activities for this skill")
            }
        }
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodaysHighlightsScreen(onBack: () -> Unit) {
    // Dummy data – replace with real values later
    val tasksCompleted = 3
    val totalTasks = 4
    val pointsEarned = 25
    val mainMoodEmoji = "😊"
    val mainMoodText = "Mostly happy and calm"

    val learningHighlights = listOf(
        "Practiced fractions (1/2, 1/3, 1/4) in Math",
        "Read a short story and answered questions in English",
        "Reviewed basic science facts about plants"
    )

    val achievements = listOf(
        "Stayed on task for a full study block",
        "Completed homework without reminders",
        "Used the timer to finish chores"
    )

    val challenges = listOf(
        "Needed extra prompts to start afternoon homework",
        "Found it hard to switch from games to study"
    )

    val teacherParentNote =
        "You can support tomorrow by keeping study blocks short (10–15 minutes) and adding a quick movement break in between."

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FA))
    ) {
        TopAppBar(
            title = { Text("Today's Highlights") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Summary card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text("Today at a glance", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "$mainMoodEmoji  $mainMoodText",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Tasks completed: $tasksCompleted / $totalTasks • Points earned: $pointsEarned",
                        fontSize = 13.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Overall, today went ${if (challenges.isEmpty()) "smoothly." else "well, with a few moments that needed extra support."}",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Learning section
            Text("Learning & activities", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    learningHighlights.forEach { item ->
                        Row(
                            verticalAlignment = Alignment.Top,
                            modifier = Modifier.padding(vertical = 2.dp)
                        ) {
                            Text("• ", fontSize = 13.sp)
                            Text(item, fontSize = 13.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Achievements
            Text("Wins & achievements", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    achievements.forEach { item ->
                        Row(
                            verticalAlignment = Alignment.Top,
                            modifier = Modifier.padding(vertical = 2.dp)
                        ) {
                            Text("⭐ ", fontSize = 13.sp)
                            Text(item, fontSize = 13.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Challenges (if any)
            if (challenges.isNotEmpty()) {
                Text("Moments that needed support", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF3E0))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        challenges.forEach { item ->
                            Row(
                                verticalAlignment = Alignment.Top,
                                modifier = Modifier.padding(vertical = 2.dp)
                            ) {
                                Text("⚠️ ", fontSize = 13.sp)
                                Text(item, fontSize = 13.sp)
                            }
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))
            }

            // Note for parents
            Text("Note for you", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        teacherParentNote,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}

// Put these near your other enums, outside any @Composable
enum class TaskStatus { PENDING, REVIEW, DONE }

enum class TaskFilter { ALL, TODAY, WEEK, COMPLETED }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParentTasksScreen(onBack: () -> Unit) {
    data class ParentTask(
        val id: Int,
        val title: String,
        val category: String,   // Homework, Chore, Mindfulness, Other
        val dueLabel: String,   // "Today", "Tomorrow", "This week"
        val points: Int,
        val status: TaskStatus
    )

    var tasks by remember {
        mutableStateOf(
            listOf(
                ParentTask(1, "Math homework", "Homework", "Today", 10, TaskStatus.REVIEW),
                ParentTask(2, "Clean room", "Chore", "Today", 5, TaskStatus.PENDING),
                ParentTask(3, "Mindfulness break", "Mindfulness", "Today", 3, TaskStatus.DONE),
                ParentTask(4, "Reading time", "Homework", "This week", 8, TaskStatus.PENDING)
            )
        )
    }

    var filter by remember { mutableStateOf(TaskFilter.TODAY) }
    var nextId by remember { mutableStateOf(5) }

    val pendingCount = tasks.count { it.status == TaskStatus.PENDING }
    val doneCount = tasks.count { it.status == TaskStatus.DONE }
    val pointsThisWeek = tasks.filter { it.status == TaskStatus.DONE }.sumOf { it.points }

    fun filteredTasks(): List<ParentTask> = when (filter) {
        TaskFilter.ALL -> tasks
        TaskFilter.TODAY -> tasks.filter { it.dueLabel == "Today" }
        TaskFilter.WEEK -> tasks.filter { it.dueLabel == "This week" || it.dueLabel == "Today" }
        TaskFilter.COMPLETED -> tasks.filter { it.status == TaskStatus.DONE }
    }

    fun approveTask(task: ParentTask) {
        tasks = tasks.map {
            if (it.id == task.id) it.copy(status = TaskStatus.DONE) else it
        }
    }

    fun rejectTask(task: ParentTask) {
        tasks = tasks.map {
            if (it.id == task.id) it.copy(status = TaskStatus.PENDING) else it
        }
    }

    fun addQuickTask() {
        val newTask = ParentTask(
            id = nextId++,
            title = "New task",
            category = "Other",
            dueLabel = "Today",
            points = 5,
            status = TaskStatus.PENDING
        )
        tasks = tasks + newTask
    }

    fun categoryColor(category: String): Color = when (category) {
        "Homework" -> Color(0xFF90CAF9)
        "Chore" -> Color(0xFFFFF59D)
        "Mindfulness" -> Color(0xFFA5D6A7)
        else -> Color(0xFFE0E0E0)
    }

    fun statusColor(status: TaskStatus): Color = when (status) {
        TaskStatus.PENDING -> Color(0xFFFFA000)
        TaskStatus.REVIEW -> Color(0xFF42A5F5)
        TaskStatus.DONE -> Color(0xFF66BB6A)
    }

    fun statusLabel(status: TaskStatus): String = when (status) {
        TaskStatus.PENDING -> "Pending"
        TaskStatus.REVIEW -> "Needs review"
        TaskStatus.DONE -> "Done"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FA))
    ) {
        TopAppBar(
            title = { Text("Tasks") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Overview", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Pending: $pendingCount • Completed: $doneCount • Points this week: $pointsThisWeek",
                        fontSize = 14.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Most tasks are ${if (doneCount >= pendingCount) "getting done on time." else "still pending. A quick check‑in may help."}",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            Text("Filter", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                val baseModifier = Modifier.weight(1f)

                Button(
                    onClick = { filter = TaskFilter.TODAY },
                    modifier = baseModifier,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (filter == TaskFilter.TODAY) Color(0xFF4CAF50) else Color(0xFFE0E0E0),
                        contentColor = if (filter == TaskFilter.TODAY) Color.White else Color.Black
                    )
                ) {
                    Text("Today", fontSize = 12.sp)
                }

                Button(
                    onClick = { filter = TaskFilter.WEEK },
                    modifier = baseModifier,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (filter == TaskFilter.WEEK) Color(0xFF4CAF50) else Color(0xFFE0E0E0),
                        contentColor = if (filter == TaskFilter.WEEK) Color.White else Color.Black
                    )
                ) {
                    Text("This week", fontSize = 12.sp)
                }

                Button(
                    onClick = { filter = TaskFilter.ALL },
                    modifier = baseModifier,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (filter == TaskFilter.ALL) Color(0xFF4CAF50) else Color(0xFFE0E0E0),
                        contentColor = if (filter == TaskFilter.ALL) Color.White else Color.Black
                    )
                ) {
                    Text("All", fontSize = 12.sp)
                }

                Button(
                    onClick = { filter = TaskFilter.COMPLETED },
                    modifier = baseModifier,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (filter == TaskFilter.COMPLETED) Color(0xFF4CAF50) else Color(0xFFE0E0E0),
                        contentColor = if (filter == TaskFilter.COMPLETED) Color.White else Color.Black
                    )
                ) {
                    Text("Completed", fontSize = 12.sp)
                }
            }


            Spacer(Modifier.height(16.dp))

            val visibleTasks = filteredTasks()
            if (visibleTasks.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No tasks for this view. Try a different filter.", fontSize = 13.sp)
                }
            } else {
                visibleTasks.forEach { task ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(task.title, fontWeight = FontWeight.SemiBold)
                                    Text(
                                        "${task.dueLabel} • ${task.points} pts",
                                        fontSize = 12.sp,
                                        color = Color.Gray
                                    )
                                }

                                Surface(
                                    color = categoryColor(task.category).copy(alpha = 0.3f),
                                    shape = CircleShape
                                ) {
                                    Text(
                                        task.category,
                                        fontSize = 11.sp,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }

                                Spacer(Modifier.width(8.dp))

                                Surface(
                                    color = statusColor(task.status).copy(alpha = 0.18f),
                                    shape = CircleShape
                                ) {
                                    Text(
                                        statusLabel(task.status),
                                        fontSize = 11.sp,
                                        color = statusColor(task.status),
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }

                            if (task.status == TaskStatus.REVIEW) {
                                Spacer(Modifier.height(8.dp))
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Button(
                                        onClick = { approveTask(task) },
                                        modifier = Modifier.weight(1f),
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Color(0xFF4CAF50),
                                            contentColor = Color.White
                                        )
                                    ) {
                                        Icon(Icons.Default.Check, contentDescription = "Approve")
                                        Spacer(Modifier.width(4.dp))
                                        Text("Approve")
                                    }
                                    OutlinedButton(
                                        onClick = { rejectTask(task) },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(Icons.Default.Refresh, contentDescription = "Try again")
                                        Spacer(Modifier.width(4.dp))
                                        Text("Try again")
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.weight(1f))

            Button(
                onClick = { addQuickTask() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add task")
                Spacer(Modifier.width(8.dp))
                Text("Add Task")
            }
        }
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EngagementLevelsScreen(onBack: () -> Unit) {
    // Dummy data – replace with real metrics later
    val focusMinutesToday = 32
    val activitiesCompletedToday = 5
    val activeDaysThisWeek = 4

    // Weekly engagement (Low / Medium / High)
    data class DayEngagement(val day: String, val level: String, val score: Int)
    val weekEngagement = listOf(
        DayEngagement("Mon", "High", 3),
        DayEngagement("Tue", "Medium", 2),
        DayEngagement("Wed", "Low", 1),
        DayEngagement("Thu", "Medium", 2),
        DayEngagement("Fri", "High", 3),
        DayEngagement("Sat", "Medium", 2),
        DayEngagement("Sun", "Low", 1)
    )

    // Activity breakdown percentages
    val studyPct = 40
    val gamesPct = 25
    val mindfulnessPct = 15
    val tasksPct = 20

    val totalFocusGoalMinutes = 30
    val engagementScoreLabel: String
    val engagementColor: Color
    when {
        focusMinutesToday >= totalFocusGoalMinutes && activitiesCompletedToday >= 4 -> {
            engagementScoreLabel = "High engagement"
            engagementColor = Color(0xFF66BB6A)
        }
        focusMinutesToday >= 15 -> {
            engagementScoreLabel = "Medium engagement"
            engagementColor = Color(0xFFFFCA28)
        }
        else -> {
            engagementScoreLabel = "Low engagement"
            engagementColor = Color(0xFFEF5350)
        }
    }

    fun levelColor(level: String): Color = when (level) {
        "High" -> Color(0xFF66BB6A)
        "Medium" -> Color(0xFFFFCA28)
        else -> Color(0xFFEF5350)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FA))
    ) {
        TopAppBar(
            title = { Text("Engagement Levels") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Summary card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Today", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Focus time: ${focusMinutesToday} min • Activities completed: $activitiesCompletedToday",
                        fontSize = 14.sp
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Active days this week: $activeDaysThisWeek / 7",
                        fontSize = 13.sp
                    )
                    Spacer(Modifier.height(8.dp))
                    Surface(
                        color = engagementColor.copy(alpha = 0.15f),
                        shape = CircleShape
                    ) {
                        Text(
                            engagementScoreLabel,
                            color = engagementColor,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Goal: 20–30 minutes of focused activities on at least 5 days each week.",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                }
            }

            Spacer(Modifier.height(16.dp))

            // Activity breakdown
            Text("Where time is spent", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Column {
                Text("Where time is spent", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                Column {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(vertical = 2.dp)
                    ) {
                        Text("Study", modifier = Modifier.width(90.dp), fontSize = 13.sp)
                        LinearProgressIndicator(
                            progress = { studyPct / 100f },
                            modifier = Modifier
                                .weight(1f)
                                .height(8.dp),
                            color = Color(0xFF42A5F5),
                            trackColor = Color(0xFFE0E0E0)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("$studyPct%", fontSize = 12.sp)
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(vertical = 2.dp)
                    ) {
                        Text("Games", modifier = Modifier.width(90.dp), fontSize = 13.sp)
                        LinearProgressIndicator(
                            progress = { gamesPct / 100f },
                            modifier = Modifier
                                .weight(1f)
                                .height(8.dp),
                            color = Color(0xFFFFB74D),
                            trackColor = Color(0xFFE0E0E0)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("$gamesPct%", fontSize = 12.sp)
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(vertical = 2.dp)
                    ) {
                        Text("Mindfulness", modifier = Modifier.width(90.dp), fontSize = 13.sp)
                        LinearProgressIndicator(
                            progress = { mindfulnessPct / 100f },
                            modifier = Modifier
                                .weight(1f)
                                .height(8.dp),
                            color = Color(0xFF81C784),
                            trackColor = Color(0xFFE0E0E0)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("$mindfulnessPct%", fontSize = 12.sp)
                    }

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(vertical = 2.dp)
                    ) {
                        Text("Tasks", modifier = Modifier.width(90.dp), fontSize = 13.sp)
                        LinearProgressIndicator(
                            progress = { tasksPct / 100f },
                            modifier = Modifier
                                .weight(1f)
                                .height(8.dp),
                            color = Color(0xFFAB47BC),
                            trackColor = Color(0xFFE0E0E0)
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("$tasksPct%", fontSize = 12.sp)
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Weekly engagement strip
            Text("This week", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                weekEngagement.forEach { day ->
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .height(40.dp)
                                .width(12.dp)
                                .background(
                                    color = levelColor(day.level),
                                    shape = RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp)
                                )
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(day.day, fontSize = 11.sp)
                    }
                }
            }


            Spacer(Modifier.height(16.dp))

            // Simple suggestion
            Text("Suggestions", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = if (focusMinutesToday < 20)
                            "Engagement is a bit low today. Try one extra short study or mindfulness block with a fun reward."
                        else
                            "Engagement looks healthy. Keep sessions short, positive, and consistent across the week.",
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun UpdateScheduleScreen(onBack: () -> Unit) {
    // ---- simple model ----
    data class ScheduleBlock(
        val id: Int,
        val startTime: String,
        val endTime: String,
        val type: String,
        val note: String = ""
    )

    val activityTypes = listOf("Study", "Play", "Mindfulness", "Task", "Free Time")

    var nextId by remember { mutableStateOf(3) }
    var blocks by remember {
        mutableStateOf(
            listOf(
                ScheduleBlock(0, "04:00 PM", "04:30 PM", "Study", "Homework / reading"),
                ScheduleBlock(1, "04:30 PM", "04:45 PM", "Play", "Short game break"),
                ScheduleBlock(2, "04:45 PM", "05:00 PM", "Mindfulness", "Breathing / calm time")
            )
        )
    }

    var showSheet by remember { mutableStateOf(false) }
    var editingBlockId by remember { mutableStateOf<Int?>(null) }

    var startTimeText by remember { mutableStateOf("04:00 PM") }
    var endTimeText by remember { mutableStateOf("04:30 PM") }
    var selectedType by remember { mutableStateOf(activityTypes[0]) }
    var noteText by remember { mutableStateOf("") }

    fun openAddBlock() {
        editingBlockId = null
        startTimeText = "04:00 PM"
        endTimeText = "04:30 PM"
        selectedType = activityTypes[0]
        noteText = ""
        showSheet = true
    }

    fun openEditBlock(block: ScheduleBlock) {
        editingBlockId = block.id
        startTimeText = block.startTime
        endTimeText = block.endTime
        selectedType = block.type
        noteText = block.note
        showSheet = true
    }

    fun saveBlock() {
        if (editingBlockId == null) {
            val newBlock = ScheduleBlock(
                id = nextId++,
                startTime = startTimeText,
                endTime = endTimeText,
                type = selectedType,
                note = noteText
            )
            blocks = (blocks + newBlock).sortedBy { it.startTime }
        } else {
            blocks = blocks.map {
                if (it.id == editingBlockId) {
                    it.copy(
                        startTime = startTimeText,
                        endTime = endTimeText,
                        type = selectedType,
                        note = noteText
                    )
                } else it
            }.sortedBy { it.startTime }
        }
        showSheet = false
    }

    fun deleteBlock(id: Int) {
        blocks = blocks.filterNot { it.id == id }
    }

    fun typeColor(type: String): Color = when (type) {
        "Study" -> Color(0xFF90CAF9)
        "Play" -> Color(0xFFFFF59D)
        "Mindfulness" -> Color(0xFFA5D6A7)
        "Task" -> Color(0xFFFFCC80)
        else -> Color(0xFFEEEEEE)
    }

    // ---- main screen ----
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FA))
    ) {
        TopAppBar(
            title = { Text("Update Schedule") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Today", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text("Tap a block to edit", fontSize = 12.sp, color = Color.Gray)
            }

            Spacer(Modifier.height(12.dp))

            if (blocks.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No schedule blocks yet. Add one below.")
                }
            } else {
                blocks.forEach { block ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clickable { openEditBlock(block) },
                        colors = CardDefaults.cardColors(containerColor = typeColor(block.type))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "${block.startTime} - ${block.endTime}",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp
                                )
                                Text(block.type, fontSize = 13.sp)
                                if (block.note.isNotBlank()) {
                                    Text(block.note, fontSize = 12.sp)
                                }
                            }
                            IconButton(onClick = { deleteBlock(block.id) }) {
                                Icon(Icons.Default.Delete, contentDescription = "Delete")
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.weight(1f))

            Button(
                onClick = { openAddBlock() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add")
                Spacer(Modifier.width(8.dp))
                Text("Add Block")
            }
        }
    }

    // ---- bottom sheet ----
    if (showSheet) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

        ModalBottomSheet(
            onDismissRequest = { showSheet = false },
            sheetState = sheetState
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(
                    if (editingBlockId == null) "Add Schedule Block" else "Edit Schedule Block",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
                Spacer(Modifier.height(12.dp))

                OutlinedTextField(
                    value = startTimeText,
                    onValueChange = { startTimeText = it },
                    label = { Text("Start time (e.g. 04:00 PM)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = endTimeText,
                    onValueChange = { endTimeText = it },
                    label = { Text("End time (e.g. 04:30 PM)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(12.dp))

                Text("Activity type", fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(8.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    activityTypes.forEach { type ->
                        val selected = type == selectedType
                        Button(
                            onClick = { selectedType = type },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (selected) Color(0xFF4CAF50) else Color(0xFFE0E0E0),
                                contentColor = if (selected) Color.White else Color.Black
                            )
                        ) {
                            Text(type, fontSize = 12.sp)
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))

                OutlinedTextField(
                    value = noteText,
                    onValueChange = { noteText = it },
                    label = { Text("Note (optional)") },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(Modifier.height(16.dp))

                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    OutlinedButton(
                        onClick = { showSheet = false },
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Cancel")
                    }
                    Button(
                        onClick = { saveBlock() },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                    ) {
                        Text("Save")
                    }
                }
            }
        }
    }
}


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParentMoodMeterScreen(onBack: () -> Unit) {
    // Dummy mood data – later replace with real logs
    data class DayMood(
        val dayLabel: String,     // "Mon"
        val dominantMood: String, // "Happy", "Calm", "Worried", "Angry"
        val emoji: String,
        val notes: List<String>
    )

    val last7Days = listOf(
        DayMood("Mon", "Happy", "😊", listOf("Played games after homework")),
        DayMood("Tue", "Worried", "😟", listOf("Math test at school")),
        DayMood("Wed", "Calm", "🙂", listOf("Good focus in study session")),
        DayMood("Thu", "Angry", "😡", listOf("Argument with sibling")),
        DayMood("Fri", "Happy", "😄", listOf("Finished project, extra game time")),
        DayMood("Sat", "Calm", "😊", listOf("Outdoor play and mindfulness")),
        DayMood("Sun", "Happy", "😄", listOf("Family outing"))
    )

    val totalDays = last7Days.size.toFloat()
    fun percentage(mood: String): Int =
        ((last7Days.count { it.dominantMood == mood } / totalDays) * 100).toInt()

    var selectedDay by remember { mutableStateOf(last7Days.last()) }

    // Rough concern level based on number of Worried/Angry days
    val toughDays = last7Days.count { it.dominantMood == "Worried" || it.dominantMood == "Angry" }
    val concernText: String
    val concernColor: Color
    val concernExplanation: String
    when {
        toughDays <= 1 -> {
            concernText = "Balanced week"
            concernColor = Color(0xFF66BB6A)
            concernExplanation = "Most days look calm or happy overall."
        }
        toughDays in 2..3 -> {
            concernText = "Some tough days"
            concernColor = Color(0xFFFFCA28)
            concernExplanation = "There were a few worried or angry days. A gentle check‑in can help."
        }
        else -> {
            concernText = "Needs attention"
            concernColor = Color(0xFFEF5350)
            concernExplanation = "Several days were hard. Consider talking with your child and adjusting supports."
        }
    }

    val todayLabel = "Today · " + last7Days.last().dayLabel

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FA))
    ) {
        TopAppBar(
            title = { Text("Mood Meter") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Header row with date and concern chip
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(todayLabel, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    Text("Overview of recent moods", fontSize = 12.sp, color = Color.Gray)
                }
                Surface(
                    color = concernColor.copy(alpha = 0.15f),
                    shape = CircleShape
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .background(concernColor, CircleShape)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(concernText, fontSize = 12.sp, color = concernColor)
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Today summary card (using last day as "today")
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFE3F2FD))
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Today", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "${last7Days.last().emoji}  Mostly ${last7Days.last().dominantMood.lowercase()} today",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "3 check‑ins logged • Most common mood: ${last7Days.last().dominantMood}",
                        fontSize = 13.sp
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Text(concernExplanation, fontSize = 12.sp, color = Color.Gray)
            Spacer(Modifier.height(16.dp))

            // Weekly strip
            Text("Last 7 days", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                last7Days.forEach { day ->
                    val isSelected = day.dayLabel == selectedDay.dayLabel
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier
                            .weight(1f)
                            .clickable { selectedDay = day }
                            .padding(vertical = 4.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(if (isSelected) 42.dp else 36.dp)
                                .background(
                                    color = if (isSelected) Color(0xFF4CAF50) else Color(0xFFE0E0E0),
                                    shape = CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(day.emoji, fontSize = 20.sp)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(day.dayLabel, fontSize = 12.sp)
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Mood breakdown
            Text("Mood breakdown", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Column {
                listOf("Happy", "Calm", "Worried", "Angry").forEach { mood ->
                    val pct = percentage(mood)
                    if (pct > 0) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 2.dp)
                        ) {
                            Text(
                                mood,
                                modifier = Modifier.width(70.dp),
                                fontSize = 13.sp
                            )
                            LinearProgressIndicator(
                                progress = { pct / 100f },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(8.dp),
                                color = when (mood) {
                                    "Happy" -> Color(0xFF66BB6A)
                                    "Calm" -> Color(0xFF42A5F5)
                                    "Worried" -> Color(0xFFFFCA28)
                                    else -> Color(0xFFEF5350)
                                },
                                trackColor = Color(0xFFE0E0E0)
                            )
                            Spacer(Modifier.width(8.dp))
                            Text("$pct%", fontSize = 12.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // Notes / events for selected day
            Text(
                "Notes for ${selectedDay.dayLabel}",
                fontWeight = FontWeight.SemiBold
            )
            Spacer(Modifier.height(8.dp))
            if (selectedDay.notes.isEmpty()) {
                Text("No notes for this day.", fontSize = 13.sp)
            } else {
                selectedDay.notes.forEach { note ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFFFF))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("•", modifier = Modifier.padding(end = 8.dp))
                            Text(note, fontSize = 13.sp)
                        }
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Call-to-action to link with schedule (for now this is a stub button)
            OutlinedButton(
                onClick = {
                    // Later: navigate to UpdateScheduleScreen using your enum/nav
                    // e.g. onAdjustScheduleClick()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Schedule, contentDescription = "Adjust schedule")
                Spacer(Modifier.width(8.dp))
                Text("Adjust schedule around tough times")
            }
        }
    }
}


// -------------------- Simple scaffold used by detail screens --------------------

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SimpleScaffoldScreen(
    title: String,
    body: String,
    onBack: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF9F9FA))
    ) {
        TopAppBar(
            title = { Text(title) },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(body)
        }
    }
}