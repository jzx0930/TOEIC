/* =====================================================================
 * Cloudflare Worker — Google TTS 私人代理
 * ---------------------------------------------------------------------
 * 用途：把 Google Text-to-Speech 的金鑰藏在這個 Worker 裡（存成 Secret），
 *       前端網站不再接觸金鑰，只會把要唸的字送到這個 Worker。
 *
 * 安全：
 *   - 真正的 Google 金鑰存在 Secret「GOOGLE_API_KEY」（不寫在程式裡）。
 *   - 只有附上正確「通行碼」的請求才會被處理（Secret「ACCESS_TOKEN」）。
 *   - （可選）也可再用 ALLOWED_ORIGIN 限制只接受你網站的來源。
 *
 * 前端請求格式（POST，JSON）：
 *   headers: { "Content-Type": "application/json", "x-access-token": "<你的通行碼>" }
 *   body:    { "text": "colleague", "lang": "en-US" }   // lang: en-US 或 en-GB
 * 回傳：{ "audioContent": "<base64 MP3>" }
 *
 * 需要設定的環境變數（在 Cloudflare 後台用 Secret 設定）：
 *   GOOGLE_API_KEY  你的 Google TTS 金鑰
 *   ACCESS_TOKEN    你自訂的一組通行碼（只給自己用）
 *   ALLOWED_ORIGIN  （可選）你的網站來源，例如 https://jzx0930.github.io
 * ===================================================================== */

export default {
  async fetch(request, env) {
    // 允許的來源：若有設定 ALLOWED_ORIGIN 就用它，否則放行所有來源（仍有通行碼把關）
    const allowOrigin = env.ALLOWED_ORIGIN || "*";

    // CORS 標頭（讓瀏覽器端的網站可以呼叫這個 Worker）
    const cors = {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-access-token",
      "Access-Control-Max-Age": "86400",
    };

    // 瀏覽器的預檢請求（preflight）直接回 204
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // 只接受 POST
    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, cors);
    }

    // 驗證通行碼
    const token = request.headers.get("x-access-token");
    if (!token || token !== env.ACCESS_TOKEN) {
      return json({ error: "unauthorized" }, 401, cors);
    }

    // 解析請求內容
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "bad_json" }, 400, cors);
    }

    const text = (body.text || "").toString().slice(0, 500); // 限長，避免濫用
    const isUS = (body.lang || "en-US").toString().toUpperCase().includes("US");
    if (!text) {
      return json({ error: "no_text" }, 400, cors);
    }

    // 組出送給 Google TTS 的請求（金鑰來自 Secret）
    const googleUrl =
      "https://texttospeech.googleapis.com/v1/text:synthesize?key=" +
      env.GOOGLE_API_KEY;

    const reqBody = {
      input: { text },
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

      // 只回傳前端需要的 audioContent，不外洩其他資訊
      return json({ audioContent: data.audioContent || null }, gRes.ok ? 200 : 502, cors);
    } catch (err) {
      return json({ error: "google_request_failed" }, 502, cors);
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
