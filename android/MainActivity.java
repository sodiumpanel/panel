package com.sodium.app;

import android.app.Activity;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;
import android.graphics.Color;
import android.os.Build;

public class MainActivity extends Activity {
    private WebView webView;
    private LinearLayout setupLayout;
    private EditText urlInput;
    private SharedPreferences prefs;
    private static final String PREF_NAME = "sodium_prefs";
    private static final String KEY_URL = "target_url";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(Color.parseColor("#0a0a0a"));
            getWindow().setNavigationBarColor(Color.parseColor("#0a0a0a"));
        }

        setContentView(R.layout.activity_main);
        
        prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        
        webView = findViewById(R.id.webview);
        setupLayout = findViewById(R.id.setup_layout);
        urlInput = findViewById(R.id.url_input);
        Button connectBtn = findViewById(R.id.connect_btn);
        Button resetBtn = findViewById(R.id.reset_btn);
        
        setupWebView();
        
        String savedUrl = prefs.getString(KEY_URL, null);
        if (savedUrl != null && !savedUrl.isEmpty()) {
            loadUrl(savedUrl);
        } else {
            showSetup();
        }
        
        connectBtn.setOnClickListener(v -> {
            String url = urlInput.getText().toString().trim();
            if (url.isEmpty()) {
                Toast.makeText(this, "Enter a URL", Toast.LENGTH_SHORT).show();
                return;
            }
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }
            prefs.edit().putString(KEY_URL, url).apply();
            loadUrl(url);
        });
        
        resetBtn.setOnClickListener(v -> {
            prefs.edit().remove(KEY_URL).apply();
            showSetup();
        });
    }
    
    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.setBackgroundColor(Color.parseColor("#0a0a0a"));
    }
    
    private void showSetup() {
        setupLayout.setVisibility(View.VISIBLE);
        webView.setVisibility(View.GONE);
        findViewById(R.id.reset_btn).setVisibility(View.GONE);
    }
    
    private void loadUrl(String url) {
        setupLayout.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
        findViewById(R.id.reset_btn).setVisibility(View.VISIBLE);
        webView.loadUrl(url);
    }

    @Override
    public void onBackPressed() {
        if (webView.getVisibility() == View.VISIBLE && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
