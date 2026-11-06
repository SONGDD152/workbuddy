package online.songdd.xbgj;

import android.Manifest;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebChromeClient.FileChooserParams;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.util.concurrent.Executor;

/**
 * 原生 WebView 外壳：不依赖 Chrome / Custom Tabs / Digital Asset Links，
 * 因此在没有 Chrome 的国产安卓机上也能以独立全屏窗口运行。
 *
 * 没有启动封面。冷启动先过系统生物识别（指纹/面容），通过后才加载 /app-launch：
 * 未登录落到登录页，已登录直达 /home，行为和微信一致。
 *
 * 生物识别是「本地闸门」，不是新的登录方式：
 *  - 不接管账号密码，不在设备上保存密码，服务端认证逻辑零改动；
 *  - 验证的是「这台设备面前的人能不能看已登录的会话」，会话仍是 30 天的 HttpOnly cookie；
 *  - 未验证时不加载网页、不发请求，并用原生锁屏盖住 WebView；
 *  - 只有已登录（本地存在 pb_session）时才上锁，未登录直接显示登录页；
 *  - 设备不支持 / 没录入 / 传感器异常时自动放行，永远不会把用户锁死；
 *  - 需要 Android 9（API 28）及以上的平台 BiometricPrompt，低版本退化为原来的行为。
 *
 * 为什么不用网页的 WebAuthn / 通行密钥：Android 嵌入式 WebView 默认不提供
 * navigator.credentials 的平台认证器，需要 androidx.credentials + Google Play 服务 +
 * Digital Asset Links，国产机基本不可用。原生闸门是这里唯一可靠的实现路径。
 *
 * v1.5.0 增加 DownloadListener：网页点「导出明细 / 下载 CSV」时，用系统
 * DownloadManager 带上会话 Cookie 保存到「下载」目录，否则 WebView 默认静默丢弃下载。
 *
 * 包内不打包任何网页代码，内容始终来自 https://songdd.online。
 */
public class MainActivity extends Activity {

    private static final String SITE = "https://songdd.online";
    private static final String HOST = "songdd.online";
    private static final String LAUNCH_URL = SITE + "/app-launch";
    private static final int REQ_FILE = 1001;
    private static final int REQ_CAMERA = 1002;
    private static final int REQ_STORAGE = 1003;
    private static final int BG_COLOR = Color.parseColor("#e1eff7");
    private static final int BRAND_COLOR = Color.parseColor("#5aa9e6");
    private static final int TEXT_COLOR = Color.parseColor("#284152");
    private static final int MUTED_COLOR = Color.parseColor("#547187");
    private static final int LINK_COLOR = Color.parseColor("#2f7cb5");
    /** 离开 App 超过这个时长再回来才重新上锁，避免切个消息就要按指纹。 */
    private static final long RELOCK_AFTER_MS = 5L * 60L * 1000L;

    private WebView web;
    private ProgressBar progress;
    private View lockScreen;
    private TextView lockHint;
    private ValueCallback<Uri[]> filePathCallback;
    private PermissionRequest pendingCameraRequest;
    private PendingDownload pendingDownload;
    private CancellationSignal bioCancel;
    private boolean landed = false;
    private boolean pageLoaded = false;
    private boolean locked = false;
    private boolean unlocked = false;
    private boolean prompting = false;
    /** 本次进程已确认设备不能用生物识别时，不再反复弹框。 */
    private boolean bioDisabled = false;
    private long pausedAt = 0L;

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

        lockScreen = buildLockScreen();
        root.addView(lockScreen, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));

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
        s.setUserAgentString((baseUa == null ? "" : baseUa) + " XiaoBaiGuanjiaApp/1.5.0");
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
                        + "<style>body{margin:0;background:#e1eff7;color:#284152;"
                        + "font-family:sans-serif;display:flex;align-items:center;"
                        + "justify-content:center;min-height:100vh;text-align:center}"
                        + ".box{padding:32px}h1{font-size:20px}"
                        + "p{font-size:14px;color:#547187;line-height:1.8}"
                        + "button{margin-top:20px;border:0;border-radius:999px;"
                        + "background:#2f7cb5;color:#fff;padding:12px 28px;font-size:15px}"
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

            /**
             * 网页调 getUserMedia 时，Android 会先问宿主 App 放不放行。
             * 不重写这个方法，WebView 默认一律拒绝 —— 这正是 App 内
             * 「扫码」打不开摄像头的原因。这里只放行本站发起的摄像头
             * 请求，且只授予 VIDEO_CAPTURE，麦克风等其它权限不给。
             */
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                Uri origin = request.getOrigin();
                boolean fromSite = origin != null && HOST.equals(origin.getHost());
                boolean wantsCamera = false;
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) wantsCamera = true;
                }
                if (!fromSite || !wantsCamera) {
                    request.deny();
                    return;
                }
                if (checkSelfPermission(Manifest.permission.CAMERA)
                        == PackageManager.PERMISSION_GRANTED) {
                    runOnUiThread(new Runnable() {
                        @Override public void run() {
                            request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                        }
                    });
                } else {
                    pendingCameraRequest = request;
                    requestPermissions(new String[]{Manifest.permission.CAMERA}, REQ_CAMERA);
                }
            }
        });

        /**
         * 网页点「下载 CSV」时，WebView 默认不会保存文件 —— 没有 DownloadListener
         * 就会静默无反应。这里把本站的导出文件交给系统 DownloadManager，
         * 并手动带上登录 Cookie（导出接口要鉴权，DownloadManager 不会自动带 WebView 的 cookie）。
         */
        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            Uri u = Uri.parse(url);
            if (!HOST.equals(u.getHost())) {
                launchExternal(url);
                return;
            }
            // Android 9 及以下写公共「下载」目录需要存储权限；10+ 由系统分区存储托管，无需权限
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                    && checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                            != PackageManager.PERMISSION_GRANTED) {
                pendingDownload = new PendingDownload(url, contentDisposition, mimeType);
                requestPermissions(
                        new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, REQ_STORAGE);
                return;
            }
            saveDownload(url, contentDisposition, mimeType);
        });

        // 冷启动：已登录且系统支持生物识别时先上锁，onResume 里弹验证框。
        // 注意这里刻意不 loadUrl —— 未验证之前连页面请求都不发出去。
        if (shouldLock()) {
            lock();
        } else {
            unlocked = true;
            lockScreen.setVisibility(View.GONE);
            startPage();
        }
    }

    /** 只有「已登录 + 系统可能支持生物识别」才上锁，未登录时照常显示登录页。 */
    private boolean shouldLock() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return false;
        if (bioDisabled) return false;
        String jar = CookieManager.getInstance().getCookie(SITE);
        return jar != null && jar.contains("pb_session=");
    }

    private void lock() {
        locked = true;
        unlocked = false;
        lockScreen.setVisibility(View.VISIBLE);
        setHint(R.string.lock_hint);
        // 锁屏期间禁止截屏和「最近任务」预览里出现内容
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        web.onPause();
    }

    private void unlock() {
        locked = false;
        unlocked = true;
        prompting = false;
        lockScreen.setVisibility(View.GONE);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
        web.onResume();
        startPage();
    }

    private void startPage() {
        if (pageLoaded) return;
        pageLoaded = true;
        web.loadUrl(LAUNCH_URL);
    }

    private void setHint(int resId) {
        if (lockHint != null) lockHint.setText(resId);
    }

    /**
     * 平台 BiometricPrompt（API 28+）。不引入 AndroidX，保持 APK 极小且无外部依赖。
     * 这里不用 CryptoObject：我们不解密任何东西，只借系统生物识别做一次「人在场」确认，
     * 因此不需要 Keystore 密钥、也不在设备上保存任何账号凭据。
     */
    private void promptBiometric() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P || !locked || prompting) return;
        prompting = true;
        try {
            if (bioCancel != null) bioCancel.cancel();
            bioCancel = new CancellationSignal();
            final Executor main = new Executor() {
                private final Handler h = new Handler(Looper.getMainLooper());
                @Override public void execute(Runnable r) { h.post(r); }
            };

            BiometricPrompt.Builder builder = new BiometricPrompt.Builder(this)
                    .setTitle(getString(R.string.bio_title))
                    .setSubtitle(getString(R.string.bio_subtitle))
                    .setNegativeButton(getString(R.string.bio_negative), main,
                            new DialogInterface.OnClickListener() {
                                @Override public void onClick(DialogInterface d, int which) {
                                    prompting = false;
                                    signOutAndRestart();
                                }
                            });

            builder.build().authenticate(bioCancel, main,
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override public void onAuthenticationSucceeded(
                                BiometricPrompt.AuthenticationResult result) {
                            unlock();
                        }

                        @Override public void onAuthenticationFailed() {
                            setHint(R.string.lock_failed);
                        }

                        @Override public void onAuthenticationError(int code, CharSequence msg) {
                            prompting = false;
                            // 平台 BiometricPrompt 错误码（API 28 起稳定）：
                            // 5 CANCELED · 7 LOCKOUT · 9 LOCKOUT_PERMANENT
                            // 10 USER_CANCELED · 13 NEGATIVE_BUTTON
                            boolean cancel = code == 5 || code == 10 || code == 13;
                            boolean lockout = code == 7 || code == 9;
                            if (cancel || lockout) {
                                setHint(lockout ? R.string.lock_lockout : R.string.lock_canceled);
                                return;
                            }
                            // 没硬件 / 没录入 / 传感器异常 / 厂商错误：自动放行，
                            // 宁可退化成原来的无锁体验，也绝不把用户关在门外。
                            bioDisabled = true;
                            unlock();
                        }
                    });
        } catch (Throwable t) {
            // 任何 ROM 兼容问题都走降级，不让指纹功能影响正常打开 App
            prompting = false;
            bioDisabled = true;
            unlock();
        }
    }

    /** 取消或点「改用密码登录」时清掉本地会话，回到登录页重新用账号密码进。 */
    private void signOutAndRestart() {
        bioDisabled = true;
        CookieManager cm = CookieManager.getInstance();
        cm.removeAllCookies(new ValueCallback<Boolean>() {
            @Override public void onReceiveValue(Boolean ignored) {
                cm.flush();
                locked = false;
                unlocked = true;
                prompting = false;
                lockScreen.setVisibility(View.GONE);
                getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                web.onResume();
                landed = false;
                pageLoaded = true;
                web.clearHistory();
                web.loadUrl(SITE + "/login");
            }
        });
    }

    private View buildLockScreen() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(BG_COLOR);
        box.setPadding(dp(32), dp(32), dp(32), dp(32));
        box.setClickable(true);
        box.setFocusable(true);

        ImageView icon = new ImageView(this);
        icon.setImageResource(R.mipmap.ic_launcher);
        LinearLayout.LayoutParams iconLp = new LinearLayout.LayoutParams(dp(88), dp(88));
        iconLp.gravity = Gravity.CENTER_HORIZONTAL;
        iconLp.bottomMargin = dp(20);
        box.addView(icon, iconLp);

        TextView title = new TextView(this);
        title.setText(R.string.lock_title);
        title.setTextColor(TEXT_COLOR);
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER);
        box.addView(title, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        lockHint = new TextView(this);
        lockHint.setText(R.string.lock_hint);
        lockHint.setTextColor(MUTED_COLOR);
        lockHint.setTextSize(14);
        lockHint.setGravity(Gravity.CENTER);
        lockHint.setPadding(dp(24), dp(10), dp(24), dp(28));
        box.addView(lockHint, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        Button retry = new Button(this);
        retry.setText(R.string.lock_retry);
        retry.setTextColor(Color.WHITE);
        retry.setAllCaps(false);
        retry.setTextSize(15);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(BRAND_COLOR);
        bg.setCornerRadius(dp(28));
        retry.setBackground(bg);
        retry.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { promptBiometric(); }
        });
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        btnLp.leftMargin = dp(16);
        btnLp.rightMargin = dp(16);
        box.addView(retry, btnLp);

        TextView alt = new TextView(this);
        alt.setText(R.string.lock_password);
        alt.setTextColor(LINK_COLOR);
        alt.setTextSize(14);
        alt.setGravity(Gravity.CENTER);
        alt.setPadding(dp(16), dp(24), dp(16), dp(8));
        alt.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { signOutAndRestart(); }
        });
        box.addView(alt, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        return box;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    private void launchExternal(String url) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignored) {
            // 没有能处理该链接的应用时静默忽略，避免应用崩溃
        }
    }

    /** 用系统下载器保存本站导出的 CSV；Cookie 必须手动带，否则接口会当作未登录。 */
    private void saveDownload(String url, String contentDisposition, String mimeType) {
        try {
            String name = guessFileName(url, contentDisposition);
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            String cookie = CookieManager.getInstance().getCookie(url);
            if (cookie != null && !cookie.isEmpty()) req.addRequestHeader("Cookie", cookie);
            req.addRequestHeader("Referer", SITE + "/");
            req.setMimeType("text/csv");
            req.setTitle(name);
            req.setDescription("小白管家 · 仓储明细");
            req.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);

            boolean publicDir = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                    || checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE)
                            == PackageManager.PERMISSION_GRANTED;
            if (publicDir) {
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
            } else {
                // 用户拒绝权限时仍要能导出：落到应用专属外部目录，不需要任何权限
                req.setDestinationInExternalFilesDir(
                        this, Environment.DIRECTORY_DOWNLOADS, name);
            }

            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm == null) throw new IllegalStateException("DownloadManager unavailable");
            dm.enqueue(req);
            Toast.makeText(this, publicDir
                            ? "明细开始下载，完成后在手机「下载」里查看：" + name
                            : "明细开始下载，文件在 Android/data/online.songdd.xbgj/files/Download：" + name,
                    Toast.LENGTH_LONG).show();
        } catch (Throwable t) {
            Toast.makeText(this, "保存失败，请在导出窗口点「复制明细」", Toast.LENGTH_LONG).show();
        }
    }

    /** 优先用服务端给的 ASCII 文件名，解析不出再退到 URL 末段；一律保证 .csv 结尾。 */
    private String guessFileName(String url, String disposition) {
        String name = "";
        if (disposition != null) {
            int i = disposition.toLowerCase().indexOf("filename=");
            if (i >= 0) {
                name = disposition.substring(i + "filename=".length()).trim();
                int semi = name.indexOf(';');
                if (semi >= 0) name = name.substring(0, semi);
                name = name.replace("\"", "").replace("'", "").trim();
            }
        }
        if (name.isEmpty()) {
            String last = Uri.parse(url).getLastPathSegment();
            name = last == null ? "" : last;
        }
        name = name.replace('/', '_').replace('\\', '_');
        if (!name.toLowerCase().endsWith(".csv")) name = name + ".csv";
        if (name.length() > 80) name = name.substring(name.length() - 80);
        return name.isEmpty() ? "xiaobaiguanjia-storage.csv" : name;
    }

    /** 低版本等存储权限期间先把这次下载参数存下来。 */
    private static class PendingDownload {
        final String url;
        final String disposition;
        final String mimeType;

        PendingDownload(String url, String disposition, String mimeType) {
            this.url = url;
            this.disposition = disposition;
            this.mimeType = mimeType;
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
    public void onRequestPermissionsResult(int requestCode, String[] permissions,
                                           int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_CAMERA && pendingCameraRequest != null) {
            PermissionRequest r = pendingCameraRequest;
            pendingCameraRequest = null;
            boolean granted = grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                r.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else {
                r.deny(); // 用户拒绝也没关系，扫码页仍有相册识别 / 手动输入兜底
            }
        }
        if (requestCode == REQ_STORAGE && pendingDownload != null) {
            // 无论是否授权都继续下载：拒绝时 saveDownload 会退到应用专属目录
            PendingDownload p = pendingDownload;
            pendingDownload = null;
            saveDownload(p.url, p.disposition, p.mimeType);
        }
    }

    @Override
    public void onBackPressed() {
        if (locked) {
            // 锁屏状态下返回键直接退出，不能让 WebView 往后翻页绕过验证
            finish();
            return;
        }
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        pausedAt = SystemClock.elapsedRealtime();
        if (web != null) web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (locked) {
            if (!prompting) promptBiometric();
            return;
        }
        if (web != null) web.onResume();
        if (unlocked && pausedAt > 0L
                && SystemClock.elapsedRealtime() - pausedAt > RELOCK_AFTER_MS
                && shouldLock()) {
            lock();
            promptBiometric();
        }
        pausedAt = 0L;
    }

    @Override
    protected void onDestroy() {
        if (bioCancel != null) bioCancel.cancel();
        CookieManager.getInstance().flush();
        super.onDestroy();
    }
}
