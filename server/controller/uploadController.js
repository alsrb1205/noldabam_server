// server/controller/uploadController.js

import multer from "multer";
import fs from "fs";
import path from "path";

// multer 디스크 스토리지 설정: 파일 저장 위치 및 이름 지정
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "upload_files/"; // 파일 저장 경로
    // 경로가 없으면 생성
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 고유한 파일 이름 생성 (타임스탬프 + 랜덤 숫자 + 원본 파일명)
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

/**
 * 여러 파일 업로드를 처리하는 함수.
 * FormData의 'files' 필드에서 파일을 받습니다.
 * 'maxFiles' 쿼리 파라미터로 최대 파일 수를 제한합니다.
 * 'oldFile' 바디 필드(콤마로 구분된 문자열)를 받아 이전 파일을 삭제할 수 있습니다.
 */
export const fileUpload = (req, res) => {
  // 쿼리 파라미터에서 최대 파일 수 가져오기 (없으면 기본 10개)
  const maxFiles = parseInt(req.query.maxFiles) || 10;

  // multer 미들웨어 설정: 'files' 필드에서 최대 maxFiles개의 파일을 배열로 받음
  const upload = multer({
    storage: storage,
    // 필요시 파일 필터 추가 (예: 이미지만 허용)
    // fileFilter: (req, file, cb) => { ... }
  }).array("files", maxFiles);

  // multer 미들웨어 실행
  upload(req, res, (err) => {
    // multer 관련 오류 처리
    if (err instanceof multer.MulterError) {
      console.error("Multer 오류 발생:", err);
      return res.status(500).json({ message: `Multer 오류: ${err.message}` });
    } else if (err) {
      // 기타 업로드 중 오류 처리
      console.error("파일 업로드 중 알 수 없는 오류:", err);
      return res.status(500).json({ message: `업로드 오류: ${err.message}` });
    }

    // --- 파일 업로드 성공 ---

    // oldFile 필드가 존재하고 비어있지 않은 경우에만 처리
    const oldFileArray =
      req.body.oldFile && req.body.oldFile.length > 0
        ? req.body.oldFile.split(",")
        : [];

    // 이전 파일 삭제 로직
    for (const oldFileName of oldFileArray) {
      if (oldFileName) {
        const trimmedOldFileName = oldFileName.trim(); // 앞뒤 공백 제거
        if (trimmedOldFileName) {
          const oldFilePath = path.join("upload_files/", trimmedOldFileName);
          if (fs.existsSync(oldFilePath)) {
            try {
              fs.unlinkSync(oldFilePath);
              console.log("이전 파일 삭제 완료:", oldFilePath);
            } catch (deleteError) {
              console.error("이전 파일 삭제 실패:", deleteError);
            }
          } else {
            console.warn("삭제 요청된 이전 파일을 찾을 수 없음:", oldFilePath);
          }
        }
      }
    }

    // 응답 데이터 준비
    let uploadFilePaths = []; // 저장된 파일 경로 배열
    let sourceFileNames = []; // 원본 파일 이름 배열
    let newUploadedFileNames = []; // 새로 업로드되어 생성된 파일 이름 배열

    // req.files가 존재하고 파일이 있을 경우 정보 추출
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        uploadFilePaths.push(file.path);
        sourceFileNames.push(file.originalname);
        newUploadedFileNames.push(file.filename);
      }
    } else {
      console.log("이번 요청으로 업로드된 파일이 없습니다.");
    }

    // 클라이언트에 응답 전송 (성공 상태 코드 200 사용)
    res.status(200).json({
      uploadFileName: uploadFilePaths, // 클라이언트 호환성을 위해 'uploadFileName' 유지 (경로 목록)
      sourceFileName: sourceFileNames,
      // 'oldFile' 키로 새로 생성된 파일 이름 목록을 반환 (클라이언트 호환성)
      // 클라이언트에서 이전에 oldFile 상태를 업데이트하던 로직이 있었으므로 키 이름 유지
      oldFile: newUploadedFileNames,
    });
  });
};

// 필요하다면 다른 컨트롤러 함수들을 여기에 추가...