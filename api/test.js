import 'dotenv/config';
import handler from './generate-word.js';


// モック req/res を作成
const req = { method: "POST", body: { theme: "食べ物" } };
const res = {
  status: (code) => ({
    json: (obj) => console.log("status:", code, "response:", JSON.stringify(obj, null, 2))
  })
};

// handler を呼び出す
handler(req, res);

