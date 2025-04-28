// firebaseAdmin.js
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ES module 환경에서 __dirname 흉내
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// createRequire 사용
const require = createRequire(import.meta.url);

// 🔐 .env에서 읽은 상대 경로를 절대 경로로 변환 
const keyPath = path.resolve(__dirname, process.env.FIREBASE_KEY_PATH); //Firebase 서비스 키 경로

// 안전한 방식으로 JSON 파일 import
const serviceAccount = require(keyPath);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
export { db };
