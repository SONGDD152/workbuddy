package online.songdd.xbgj;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebChromeClient.FileChooserParams;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;

/**
 * 原生 WebView 外壳：不依赖 Chrome / Custom Tabs / Digital Asset Links，
 * 因此在没有 Chrome 的国产安卓机上也能以独立全屏窗口运行。
 *
 * 没有启动封面。冷启动直接加载 /app-launch：
 * 未登录落到登录页，已登录直达 /home，行为和微信一致。
 * 包内不打包任何网页代码，内容始终来自 https://songdd.online。
 */
public class MainActivity extends Activity {

    private static final String SITE = "https://songdd.online";
    private static final String HOST = "songdd.online";
    private static final String LAUNCH_URL = SITE + "/app-launch";
    private static final int REQ_FILE = 1001;
    private static final int BG_COLOR = Color.parseColor("#e1eff7");
    private static final int BRAND_COLOR = Color.parseColor("#5aa9e6");

    private WebView web;
    private ProgressBar progress;
    private ValueCallback<Uri[]> filePathCallback;
    private boolean landed = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(BRAND_COLOR);
        getWindow().setNavigationBarColor(BG_COLOR);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG_COLOR);

        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setVisibility(View.GONE);
        root.addView(progress, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 4, Gravity.TOP));

        setContentView(root);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // 站点据此识别「这是 App 内」，隐藏网页版专属的返回主页等出口
        String baseUa = s.getUserAgentString();
        s.setUserAgentString((baseUa == null ? "" : baseUa) + " XiaoBaiGuanjiaApp/1.2.0");
        web.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String scheme = u.getScheme();
                if ("mailto".equals(scheme) || "tel".equals(scheme) || "sms".equals(scheme)) {
                    launchExternal(u.toString());
                    return true;
                }
                // 站内链接一律留在应用内，避免跳到系统浏览器
                if (HOST.equals(u.getHost())
                        && ("https".equals(scheme) || "http".equals(scheme))) {
                    return false;
                }
                launchExternal(u.toString());
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                // 登录 cookie 立即落盘：进程被系统回收后重开仍是登录态，不用反复登录
                CookieManager.getInstance().flush();
                // 首次落到登录页/主界面后清掉重定向历史，首页按返回直接退出 App
                if (!landed && (url.startsWith(SITE + "/login")
                        || url.startsWith(SITE + "/home"))) {
                    landed = true;
                    view.clearHistory();
                }
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                if (!request.isForMainFrame()) return;
                String html = "<!doctype html><html><head>"
                        + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                        + "<style>body{margin:0;background:#e1eff7;color:#1c1917;"
                        + "font-family:sans-serif;display:flex;align-items:center;"
                        + "justify-content:center;min-height:100vh;text-align:center}"
                        + ".box{padding:32px}h1{font-size:20px}"
                        + "p{font-size:14px;color:#57534e;line-height:1.8}"
                        + "button{margin-top:20px;border:0;border-radius:999px;"
                        + "background:#5aa9e6;color:#fff;padding:12px 28px;font-size:15px}"
                        + "</style></head><body><div class=\"box\">"
                        + "<h1>暂时连不上</h1>"
                        + "<p>检查网络后重试。<br>小白管家需要联网才能加载内容。</p>"
                        + "<button onclick=\"location.reload()\">重新加载</button>"
                        + "</div></body></html>";
                view.loadDataWithBaseURL(SITE + "/", html, "text/html", "utf-8", null);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progress.setProgress(newProgress);
                progress.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (filePathCallback != null) filePathCallback.onReceiveValue(null);
                filePathCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                    return true;
                } catch (Exception e) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        if (savedInstanceState != null) {
            web.restoreState(savedInstanceState);
            landed = true;
        } else {
            web.loadUrl(LAUNCH_URL);
        }
    }

    private void launchExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
            // 没有能处理该链接的应用时静默忽略，避免应用崩溃
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_FILE && filePathCallback != null) {
            Uri[] result = null;
            if (resultCode == RESULT_OK && data != null && data.getDataString() != null) {
                result = new Uri[]{Uri.parse(data.getDataString())};
            }
            filePathCallback.onReceiveValue(result);
            filePathCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (web != null) web.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        CookieManager.getInstance().flush();
        super.onDestroy();
    }
}
