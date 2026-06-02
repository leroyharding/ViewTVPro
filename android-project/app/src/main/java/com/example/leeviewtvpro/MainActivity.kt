package com.example.leeviewtvpro

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity

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

        // Register Javascript Interface for Android app control (Exit app confirmation dialog)
        webView.addJavascriptInterface(object {
            @android.webkit.JavascriptInterface
            fun exitApp() {
                runOnUiThread {
                    finish()
                }
            }
        }, "AndroidBridge")
        
        // Load the inlined React+Vite app from the android local assets
        webView.loadUrl("file:///android_asset/index.html")
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
