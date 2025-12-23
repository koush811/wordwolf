/*import 'dotenv/config';
import handler from './generate-word.js';


// モック req/res を作成
const req = { method: "POST", body: { theme: "果物" } };
const res = {
  status: (code) => ({
    json: (obj) => console.log("status:", code, "response:", JSON.stringify(obj, null, 2))
  })
};

// handler を呼び出す
handler(req, res);*/

import 'dotenv/config';
import handler from './generate-word.js';

// テスト用の擬似リクエスト
const req = {
  method: 'POST',
  body: {
    theme: '果物'  // ここを任意のテーマに変えられます
  }
};

const res = {
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    console.log('status:', this.statusCode, 'response:', data);
  }
};

// 実行
handler(req, res);

