import handler from "./generate-word.js";

const fakeReq = {
  method: "POST",
  body: { theme: "果物" },
};

const fakeRes = {
  status: (code) => {
    console.log("status:", code);
    return fakeRes;
  },
  json: (data) => {
    console.log("response:", data);
  },
};

handler(fakeReq, fakeRes);
