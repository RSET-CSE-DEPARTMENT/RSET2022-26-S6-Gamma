package com.aidie.ui.emotion

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.content.res.AssetManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.graphics.YuvImage
import android.util.Log
import android.util.Size as AndroidSize
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import org.tensorflow.lite.Interpreter
import java.io.ByteArrayOutputStream
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import kotlin.math.min
import android.graphics.ImageFormat

val ADHD_EMOTIONS = listOf("Frustrated", "Sad", "Focused", "Happy")

// ─── Tune these if the model still leans toward one class ───────────────────
// Lower a value → that class fires more easily; raise → harder to trigger
private val CLASS_THRESHOLDS = floatArrayOf(
    0.20f, // 0 Frustrated
    0.20f, // 1 Sad
    0.20f, // 2 Focused
    0.20f  // 3 Happy
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmotionDebugScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val activity = context as Activity
    val lifecycleOwner = LocalLifecycleOwner.current
    val assets = context.assets

    var showPermission by remember { mutableStateOf(true) }
    var previewView by remember { mutableStateOf<PreviewView?>(null) }
    val cameraProviderFuture = remember { ProcessCameraProvider.getInstance(context) }

    var currentEmotion by remember { mutableStateOf("Loading model...") }
    var modelStatus by remember { mutableStateOf("Not loaded") }
    var tflite: Interpreter? by remember { mutableStateOf(null) }
    var emotionBuffer by remember { mutableStateOf<List<Pair<Int, Float>>>(emptyList()) }

    // ── Model loading ────────────────────────────────────────────────────────
    LaunchedEffect(Unit) {
        try {
            // loadModelFile now correctly returns a real MappedByteBuffer
            val modelBuffer = loadModelFile(assets, "efficientnet_adhd_ready.tflite")
            val options = Interpreter.Options().apply { setNumThreads(2) }
            tflite = Interpreter(modelBuffer, options)

            // Log actual input/output tensor shapes so you can verify in Logcat
            val interp = tflite!!
            val inShape = interp.getInputTensor(0).shape()   // e.g. [1,48,48,1]
            val outShape = interp.getOutputTensor(0).shape() // e.g. [1,4]
            Log.d("EmotionDebug", "✅ Model loaded | input=${inShape.toList()} output=${outShape.toList()}")

            modelStatus = "✅ EfficientNetB2 LIVE"
            currentEmotion = "📷 Point camera at face"
        } catch (e: Exception) {
            modelStatus = "⚠️ Fallback active"
            currentEmotion = "⚠️ Model load failed – fallback"
            Log.e("EmotionDebug", "Model load failed", e)
        }
    }

    // ── Update emotion label whenever buffer changes ─────────────────────────
    LaunchedEffect(emotionBuffer) {
        if (emotionBuffer.isNotEmpty()) {
            val (idx, conf) = emotionBuffer.last()
            currentEmotion = "${ADHD_EMOTIONS[idx]} (${String.format("%.0f", conf * 100)}%)"
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        if (showPermission) {
            Column(
                modifier = Modifier.fillMaxSize().padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text("🤖 ADHD Emotion Detector", fontSize = 28.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = {
                        val granted = ContextCompat.checkSelfPermission(
                            context, Manifest.permission.CAMERA
                        ) == PackageManager.PERMISSION_GRANTED
                        if (granted) showPermission = false
                        else activity.requestPermissions(arrayOf(Manifest.permission.CAMERA), 1001)
                    },
                    modifier = Modifier.fillMaxWidth()
                ) { Text("🚀 Start Live Detection") }
            }
        } else {
            Box(
                modifier = Modifier.fillMaxSize().padding(top = 72.dp),
                contentAlignment = Alignment.TopCenter
            ) {
                Card(
                    modifier = Modifier.width(320.dp).height(400.dp),
                    shape = RoundedCornerShape(24.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    Box(Modifier.fillMaxSize()) {
                        AndroidView(
                            factory = { ctx ->
                                PreviewView(ctx).apply {
                                    scaleType = PreviewView.ScaleType.FILL_CENTER
                                    implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                                    previewView = this
                                    scaleX = -1f
                                }
                            },
                            modifier = Modifier.fillMaxSize(),
                            update = { view -> previewView = view; view.scaleX = -1f }
                        )

                        // Emotion badge
                        Card(
                            modifier = Modifier.align(Alignment.TopCenter).padding(16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = when {
                                    currentEmotion.contains("Happy")      -> Color(0xFF4CAF50)
                                    currentEmotion.contains("Frustrated") -> Color(0xFFF44336)
                                    currentEmotion.contains("Sad")        -> Color(0xFF2196F3)
                                    currentEmotion.contains("Focused")    -> Color(0xFF2E7D32)
                                    else                                   -> Color(0xFF607D8B)
                                }
                            ),
                            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
                        ) {
                            Text(
                                text = currentEmotion,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                                color = Color.White,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        TopAppBar(
            title = { Text("AI Emotion Detection") },
            navigationIcon = {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                }
            }
        )
    }

    // ── Camera + inference loop ──────────────────────────────────────────────
    var frameCounter by remember { mutableStateOf(0) }
    LaunchedEffect(previewView, showPermission) {
        val pv = previewView ?: return@LaunchedEffect
        if (showPermission) return@LaunchedEffect

        cameraProviderFuture.addListener({
            try {
                val provider = cameraProviderFuture.get()
                val preview = Preview.Builder().build()
                    .also { it.setSurfaceProvider(pv.surfaceProvider) }

                val analyzer = ImageAnalysis.Builder()
                    .setTargetResolution(AndroidSize(640, 480))
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build().also {
                        it.setAnalyzer(ContextCompat.getMainExecutor(context)) { image ->
                            try {
                                frameCounter++
                                if (frameCounter % 3 == 0) {
                                    val prediction = if (tflite != null) {
                                        predictEmotion(tflite!!, image)
                                    } else {
                                        predictFallback(image)
                                    }
                                    emotionBuffer = listOf(prediction)
                                }
                            } catch (e: Exception) {
                                Log.e("EmotionDebug", "Analysis error", e)
                            } finally {
                                image.close()
                            }
                        }
                    }

                provider.unbindAll()
                provider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, analyzer)
                Log.d("CameraDebug", "✅ Camera bound")
            } catch (e: Exception) {
                Log.e("CameraDebug", "Camera setup failed", e)
            }
        }, ContextCompat.getMainExecutor(context))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Model loading  (fixes the MappedByteBuffer cast crash)
// ─────────────────────────────────────────────────────────────────────────────
private fun loadModelFile(assets: AssetManager, modelPath: String): MappedByteBuffer {
    val afd = assets.openFd(modelPath)
    val inputStream = FileInputStream(afd.fileDescriptor)
    val fileChannel = inputStream.channel
    return fileChannel.map(FileChannel.MapMode.READ_ONLY, afd.startOffset, afd.declaredLength)
}

// ─────────────────────────────────────────────────────────────────────────────
// Inference  (fixes input shape + reads real probabilities)
// ─────────────────────────────────────────────────────────────────────────────
private fun predictEmotion(tflite: Interpreter, imageProxy: ImageProxy): Pair<Int, Float> {
    return try {
        // Resolve the true input size from the model (handles 48 or 224 etc.)
        val inputShape = tflite.getInputTensor(0).shape() // [1, H, W, C]
        val inputH = inputShape[1]
        val inputW = inputShape[2]
        val inputC = inputShape[3] // 1 = grayscale, 3 = RGB

        // Build a [1, H, W, C] ByteBuffer (float32)
        val inputBuffer = ByteBuffer.allocateDirect(1 * inputH * inputW * inputC * 4)
            .apply { order(ByteOrder.nativeOrder()) }

        fillInputBuffer(imageProxy, inputBuffer, inputH, inputW, inputC)

        // Output: [1, 4]
        val outputBuffer = Array(1) { FloatArray(4) }
        tflite.run(inputBuffer, outputBuffer)

        val probs = outputBuffer[0]
        Log.d("EmotionDebug", "Raw probs → Frustrated=${probs[0]}, Sad=${probs[1]}, Focused=${probs[2]}, Happy=${probs[3]}")

        // argmax with per-class thresholds
        var bestIdx = 2   // default: Focused
        var bestScore = CLASS_THRESHOLDS[2]
        for (i in probs.indices) {
            if (probs[i] > CLASS_THRESHOLDS[i] && probs[i] > bestScore) {
                bestScore = probs[i]
                bestIdx = i
            }
        }

        Log.d("EmotionDebug", "→ ${ADHD_EMOTIONS[bestIdx]} (${"%.2f".format(bestScore)})")
        Pair(bestIdx, bestScore)
    } catch (e: Exception) {
        Log.e("EmotionDebug", "Prediction failed", e)
        Pair(2, 0.70f)
    }
}

/**
 * Crops a centre square from the Y-plane, resizes to [H x W], and writes
 * normalised float pixels into [buffer].
 *
 * Supports both grayscale (C=1) and pseudo-RGB (C=3, same value per channel)
 * models — the model's actual channel count drives the fill loop.
 */
private fun fillInputBuffer(
    imageProxy: ImageProxy,
    buffer: ByteBuffer,
    targetH: Int,
    targetW: Int,
    channels: Int
) {
    val yPlane  = imageProxy.planes[0]
    val yBuffer = yPlane.buffer.also { it.rewind() }
    val rowStride = yPlane.rowStride

    val imgW = imageProxy.width
    val imgH = imageProxy.height

    // Centre-crop to a square
    val cropSize = min(imgW, imgH)
    val startX = (imgW - cropSize) / 2
    val startY = (imgH - cropSize) / 2

    buffer.rewind()
    for (row in 0 until targetH) {
        for (col in 0 until targetW) {
            val srcY = startY + (row * cropSize / targetH)
            val srcX = startX + (col * cropSize / targetW)
            val pixelIndex = srcY * rowStride + srcX
            val yVal = if (pixelIndex < yBuffer.limit()) {
                (yBuffer.get(pixelIndex).toInt() and 0xFF) / 255f
            } else 0.5f

            repeat(channels) { buffer.putFloat(yVal) }
        }
    }
    buffer.rewind()
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback (no model)
// ─────────────────────────────────────────────────────────────────────────────
private fun predictFallback(imageProxy: ImageProxy): Pair<Int, Float> = Pair(2, 0.70f)

// ─────────────────────────────────────────────────────────────────────────────
// Kept for potential future use
// ─────────────────────────────────────────────────────────────────────────────
private fun ImageProxy.toRealBitmap(): Bitmap {
    val yBuffer = planes[0].buffer.also { it.rewind() }
    val uBuffer = planes[1].buffer.also { it.rewind() }
    val vBuffer = planes[2].buffer.also { it.rewind() }

    val ySize = yBuffer.remaining()
    val uSize = uBuffer.remaining()
    val vSize = vBuffer.remaining()

    val nv21 = ByteArray(ySize + uSize + vSize)
    yBuffer.get(nv21, 0, ySize)
    vBuffer.get(nv21, ySize, vSize)
    uBuffer.get(nv21, ySize + vSize, uSize)

    val yuvImage = YuvImage(nv21, ImageFormat.NV21, width, height, null)
    val out = ByteArrayOutputStream()
    yuvImage.compressToJpeg(Rect(0, 0, width, height), 90, out)
    return BitmapFactory.decodeByteArray(out.toByteArray(), 0, out.size())
}