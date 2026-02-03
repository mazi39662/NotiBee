package com.cypherstudio.notibee;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import io.capawesome.capacitorjs.plugins.mlkit.barcodescanning.BarcodeScannerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        registerPlugin(BarcodeScannerPlugin.class);
    }

    @Override
    public void onStart() {
        super.onStart();
        
        // Removed custom WebChromeClient override as it interferes with Capacitor's 
        // default handling of native permissions for getUserMedia.
        /*
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = (WebView) bridge.getWebView();
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setDomStorageEnabled(true);
            
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            request.grant(request.getResources());
                        }
                    });
                }
            });
        }
        */
    }
}
