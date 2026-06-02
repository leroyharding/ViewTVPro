package com.example.leeviewtvpro

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.view.KeyEvent
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.content.FileProvider
import java.io.File

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled", "RestrictedApi")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Create WebView programmatically
        webView = WebView(this)
        
        // Configure fullscreen behavior and immersive mode flags
        webView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LOW_PROFILE or
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        )

        // WebSettings configuration
        val webSettings = webView.settings
        webSettings.javaScriptEnabled = true
        webSettings.domStorageEnabled = true
        webSettings.databaseEnabled = true
        webSettings.allowFileAccess = true
        webSettings.allowContentAccess = true
        
        // Enable media playback without user gestures (critical for TV autoplay support)
        webSettings.mediaPlaybackRequiresUserGesture = false
        
        // Enable hardware acceleration
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
        
        // Allow mixed content for local and P2P streams
        webSettings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        
        // Prevent opening external browser on URL navigation
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                return false
            }
        }
        
        // Set WebChromeClient to support media playback and JavaScript features
        webView.webChromeClient = WebChromeClient()

        // Set WebView as the content view
        setContentView(webView)

        // Register Javascript Interface for Android app control (Exit app confirmation dialog & Updater)
        webView.addJavascriptInterface(object {
            @android.webkit.JavascriptInterface
            fun exitApp() {
                runOnUiThread {
                    finish()
                }
            }

            @android.webkit.JavascriptInterface
            fun downloadAndInstallApk(apkUrl: String) {
                runOnUiThread {
                    startApkDownload(apkUrl)
                }
            }
        }, "AndroidBridge")
        
        // Load the inlined React+Vite app from the android local assets
        webView.loadUrl("file:///android_asset/index.html")
    }

    // Download the updated APK using native DownloadManager
    private fun startApkDownload(apkUrl: String) {
        val destinationFile = File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "ViewTVPro_Update.apk")
        if (destinationFile.exists()) {
            destinationFile.delete()
        }

        val request = DownloadManager.Request(Uri.parse(apkUrl))
            .setTitle("Downloading ViewTVPro Update")
            .setDescription("Preparing to install...")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
            .setDestinationUri(Uri.fromFile(destinationFile))

        val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val downloadId = dm.enqueue(request)

        val onComplete = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                val id = intent?.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
                if (id == downloadId) {
                    installApk(destinationFile)
                    unregisterReceiver(this)
                }
            }
        }
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(onComplete, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(onComplete, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE))
        }
    }

    // Launch package installer intent to install the APK
    private fun installApk(file: File) {
        val apkUri = FileProvider.getUriForFile(this, "com.example.leeviewtvpro.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(apkUri, "application/vnd.android.package-archive")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
        }
        startActivity(intent)
    }

    // Capture remote key events (Back Button support)
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            // Check if JavaScript bridge handles the back press
            webView.evaluateJavascript(
                "typeof window.handleAndroidBackPress === 'function' ? window.handleAndroidBackPress() : false",
                ValueCallback { result ->
                    if (result == "true") {
                        // JavaScript handled the back press (e.g. closed a modal or player overlay)
                    } else {
                        // Fallback: Use WebView history if available, else exit app
                        if (webView.canGoBack()) {
                            webView.goBack()
                        } else {
                            finish()
                        }
                    }
                }
            )
            return true // Event intercepted
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            // Re-apply fullscreen flags to ensure immersive Leanback D-pad experience
            webView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_LOW_PROFILE or
                View.SYSTEM_UI_FLAG_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            )
        }
    }
}
