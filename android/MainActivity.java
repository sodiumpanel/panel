package com.sodium.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import android.graphics.Color;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {
    private WebView webView;
    private LinearLayout panelListView;
    private LinearLayout addPanelView;
    private FrameLayout webviewContainer;
    private LinearLayout panelContainer;
    private LinearLayout emptyState;
    private ScrollView panelScroll;
    private EditText inputName;
    private EditText inputUrl;
    private TextView addPanelTitle;
    private SharedPreferences prefs;
    
    private static final String PREF_NAME = "sodium_prefs";
    private static final String KEY_PANELS = "panels";
    
    private int editingIndex = -1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(Color.parseColor("#0a0a0a"));
            getWindow().setNavigationBarColor(Color.parseColor("#0a0a0a"));
        }

        setContentView(R.layout.activity_main);
        
        prefs = getSharedPreferences(PREF_NAME, MODE_PRIVATE);
        
        panelListView = findViewById(R.id.panel_list_view);
        addPanelView = findViewById(R.id.add_panel_view);
        webviewContainer = findViewById(R.id.webview_container);
        panelContainer = findViewById(R.id.panel_container);
        emptyState = findViewById(R.id.empty_state);
        panelScroll = findViewById(R.id.panel_scroll);
        webView = findViewById(R.id.webview);
        inputName = findViewById(R.id.input_name);
        inputUrl = findViewById(R.id.input_url);
        addPanelTitle = findViewById(R.id.add_panel_title);
        
        ImageButton fabAdd = findViewById(R.id.fab_add);
        ImageButton btnBack = findViewById(R.id.btn_back);
        ImageButton btnCloseWebview = findViewById(R.id.btn_close_webview);
        Button btnSave = findViewById(R.id.btn_save);
        
        setupWebView();
        loadPanels();
        
        fabAdd.setOnClickListener(v -> showAddPanel());
        btnBack.setOnClickListener(v -> showPanelList());
        btnCloseWebview.setOnClickListener(v -> closeWebView());
        btnSave.setOnClickListener(v -> savePanel());
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
    
    private void showPanelList() {
        editingIndex = -1;
        inputName.setText("");
        inputUrl.setText("");
        addPanelView.setVisibility(View.GONE);
        webviewContainer.setVisibility(View.GONE);
        panelListView.setVisibility(View.VISIBLE);
        loadPanels();
    }
    
    private void showAddPanel() {
        editingIndex = -1;
        inputName.setText("");
        inputUrl.setText("");
        addPanelTitle.setText("Add Panel");
        panelListView.setVisibility(View.GONE);
        webviewContainer.setVisibility(View.GONE);
        addPanelView.setVisibility(View.VISIBLE);
    }
    
    private void showEditPanel(int index, String name, String url) {
        editingIndex = index;
        inputName.setText(name);
        inputUrl.setText(url);
        addPanelTitle.setText("Edit Panel");
        panelListView.setVisibility(View.GONE);
        webviewContainer.setVisibility(View.GONE);
        addPanelView.setVisibility(View.VISIBLE);
    }
    
    private void openPanel(String url) {
        panelListView.setVisibility(View.GONE);
        addPanelView.setVisibility(View.GONE);
        webviewContainer.setVisibility(View.VISIBLE);
        webView.loadUrl(url);
    }
    
    private void closeWebView() {
        webView.loadUrl("about:blank");
        showPanelList();
    }
    
    private void savePanel() {
        String name = inputName.getText().toString().trim();
        String url = inputUrl.getText().toString().trim();
        
        if (name.isEmpty()) {
            Toast.makeText(this, "Enter a name", Toast.LENGTH_SHORT).show();
            return;
        }
        
        if (url.isEmpty()) {
            Toast.makeText(this, "Enter a URL", Toast.LENGTH_SHORT).show();
            return;
        }
        
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        
        try {
            JSONArray panels = getPanels();
            JSONObject panel = new JSONObject();
            panel.put("name", name);
            panel.put("url", url);
            
            if (editingIndex >= 0) {
                panels.put(editingIndex, panel);
            } else {
                panels.put(panel);
            }
            
            prefs.edit().putString(KEY_PANELS, panels.toString()).apply();
            Toast.makeText(this, editingIndex >= 0 ? "Panel updated" : "Panel added", Toast.LENGTH_SHORT).show();
            showPanelList();
        } catch (Exception e) {
            Toast.makeText(this, "Error saving panel", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void deletePanel(int index) {
        new AlertDialog.Builder(this, android.R.style.Theme_Material_Dialog_Alert)
            .setTitle("Delete Panel")
            .setMessage("Are you sure you want to delete this panel?")
            .setPositiveButton("Delete", (dialog, which) -> {
                try {
                    JSONArray panels = getPanels();
                    JSONArray newPanels = new JSONArray();
                    for (int i = 0; i < panels.length(); i++) {
                        if (i != index) {
                            newPanels.put(panels.get(i));
                        }
                    }
                    prefs.edit().putString(KEY_PANELS, newPanels.toString()).apply();
                    loadPanels();
                    Toast.makeText(this, "Panel deleted", Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Toast.makeText(this, "Error deleting panel", Toast.LENGTH_SHORT).show();
                }
            })
            .setNegativeButton("Cancel", null)
            .show();
    }
    
    private JSONArray getPanels() {
        try {
            String json = prefs.getString(KEY_PANELS, "[]");
            return new JSONArray(json);
        } catch (Exception e) {
            return new JSONArray();
        }
    }
    
    private void loadPanels() {
        panelContainer.removeAllViews();
        JSONArray panels = getPanels();
        
        if (panels.length() == 0) {
            emptyState.setVisibility(View.VISIBLE);
            panelScroll.setVisibility(View.GONE);
        } else {
            emptyState.setVisibility(View.GONE);
            panelScroll.setVisibility(View.VISIBLE);
            
            LayoutInflater inflater = LayoutInflater.from(this);
            
            for (int i = 0; i < panels.length(); i++) {
                try {
                    JSONObject panel = panels.getJSONObject(i);
                    String name = panel.getString("name");
                    String url = panel.getString("url");
                    final int index = i;
                    
                    View itemView = inflater.inflate(R.layout.panel_item, panelContainer, false);
                    
                    TextView nameView = itemView.findViewById(R.id.panel_name);
                    TextView urlView = itemView.findViewById(R.id.panel_url);
                    ImageButton btnEdit = itemView.findViewById(R.id.btn_edit);
                    ImageButton btnDelete = itemView.findViewById(R.id.btn_delete);
                    
                    nameView.setText(name);
                    urlView.setText(url);
                    
                    itemView.setOnClickListener(v -> openPanel(url));
                    btnEdit.setOnClickListener(v -> showEditPanel(index, name, url));
                    btnDelete.setOnClickListener(v -> deletePanel(index));
                    
                    panelContainer.addView(itemView);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (webviewContainer.getVisibility() == View.VISIBLE) {
            if (webView.canGoBack()) {
                webView.goBack();
            } else {
                closeWebView();
            }
        } else if (addPanelView.getVisibility() == View.VISIBLE) {
            showPanelList();
        } else {
            super.onBackPressed();
        }
    }
}
