/* =====================================================================
 * Cloudflare Worker — Google TTS 私人代理（用「來源網域」保護，無需通行碼）
 * ---------------------------------------------------------------------
 * 用途：把 Google Text-to-Speech 的金鑰藏在這個 Worker 裡（存成 Secret），
 *       前端網站不再接觸金鑰，只會把要唸的字送到這個 Worker。
 *
 * 保護方式：
 *   - 真正的 Google 金鑰存在 Secret「GOOGLE_API_KEY」（不寫在程式裡）。
 *   - 只接受「來自你網站」的請求：用請求的 Origin 標頭比對 ALLOWED_ORIGIN。
 *     → 使用者不必輸入任何通行碼，但別人也無法用你的代理亂打。
 *   - ALLOWED_ORIGIN 可填多個（用逗號分隔），方便同時允許正式網址與本機測試。
 *
 * 前端請求格式（POST，JSON）：
 *   headers: { "Content-Type": "application/json" }
 *   body:    { "text": "colleague", "lang": "en-US" }   // lang: en-US 或 en-GB
 * 回傳：{ "audioContent": "<base64 MP3>" }
 *
 * 需要設定的環境變數（在 Cloudflare 後台設定）：
 *   GOOGLE_API_KEY  你的 Google TTS 金鑰（類型：Secret）
 *   ALLOWED_ORIGIN  允許的網站來源，可多個用逗號分隔（類型：一般變數即可）
 *                   例如：https://jzx0930.github.io,http://localhost:8000
 *                   （若留空＝不限制來源，公開時不建議）
 * ===================================================================== */

export default {
  async fetch(request, env) {
    // 解析允許的來源清單（逗號分隔），全部去空白
    const allowedList = (env.ALLOWED_ORIGIN || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const origin = request.headers.get("Origin") || "";
    const noRestriction = allowedList.length === 0; // 沒設就不限制
    const originAllowed = noRestriction || allowedList.includes(origin);

    // 要回給瀏覽器的 CORS 來源：相符就回該來源，否則回第一個（或 *）
    const acao = noRestriction ? "*" : (allowedList.includes(origin) ? origin : allowedList[0]);

    const cors = {
      "Access-Control-Allow-Origin": acao,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };

    // 瀏覽器的預檢請求（preflight）直接回 204
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // 只接受 POST
    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, cors);
    }

    // 來源不在允許清單 → 拒絕（這就是「只給自己網站用」的關卡）
    if (!originAllowed) {
      return json({ error: "forbidden_origin" }, 403, cors);
    }

    // 解析請求內容
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad_json" }, 400, cors);
    }

    const text = (body.text || "").toString().slice(0, 500); // 限長，避免濫用
    const ssml = (body.ssml || "").toString().slice(0, 800);  // 支援 SSML（例如 <phoneme> 唸單一音素）
    const isUS = (body.lang || "en-US").toString().toUpperCase().includes("US");
    if (!text && !ssml) {
      return json({ error: "no_text" }, 400, cors);
    }

    // 組出送給 Google TTS 的請求（金鑰來自 Secret）
    const googleUrl =
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=" +
      env.GOOGLE_API_KEY;

    const reqBody = {
      input: ssml ? { ssml } : { text }, // 有 SSML 就用 ssml，否則用純文字
      voice: {
        languageCode: isUS ? "en-US" : "en-GB",
        name: isUS ? "en-US-Standard-C" : "en-GB-Standard-A", // Standard 女聲
        ssmlGender: "FEMALE",
      },
      audioConfig: { audioEncoding: "MP3", pitch: 0, speakingRate: 1.0 },
    };

    try {
      const gRes = await fetch(googleUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });
      const data = await gRes.json();

      // Google 回錯時：記到 log 並把原因透給前端，方便除錯
      if (!gRes.ok) {
        console.error("Google TTS error:", gRes.status, JSON.stringify(data));
        return json(
          {
            audioContent: null,
            googleStatus: gRes.status,
            googleError: (data && data.error) ? data.error : data,
          },
          502,
          cors
        );
      }

      // 成功：只回傳前端需要的 audioContent
      return json({ audioContent: data.audioContent || null }, 200, cors);
    } catch (err) {
      console.error("google_request_failed:", err && err.message);
      return json({ error: "google_request_failed", detail: err && err.message }, 502, cors);
    }
  },
};

// 小工具：回傳 JSON 並帶上 CORS 標頭
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
