const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3000;
const upload = multer({ dest: 'uploads/' });

// ✅ 정적 파일 서빙
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI("API-KEY");

app.post('/chat', upload.single('image'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

        const prompt = `
        당신의 역할은 영화/드라마 장면을 인식하고 VOD 정보를 제공하는 지능형 챗봇입니다.
        
        사용자가 업로드한 이미지(캡처 장면)를 기반으로 다음 정보를 JSON 형식으로 반환해 주세요.
        반드시 아래 JSON 형식과 **동일한 키**를 사용해 주세요. **절대로 백틱(\\\`\\\`\\\`)이나 코드블록 마크다운은 포함하지 마세요.**
        
        응답 형식 예시 (출력 시 아래 양식 그대로, 코드블럭 없이 순수 JSON만):
        {
          "title": "영화 또는 드라마 제목",
          "sceneDescription": "장면 설명",
          "characters": ["극중 인물명(배우명)", "극중 인물명(배우명)"],
          "director": "감독 이름",
          "keywords": ["복수", "삼각 관계", "느와르"],
          "realtimeInfo": {
            "type": "movie" 또는 "tv",
            "items": [
              { "rank": 1, "title": "작품명", "releaseDate": "개봉일", "audience": "관객수 또는 메타정보" }
            ]
          },
          "elasticsearchQuery": "복수,삼각 관계,느와르"
        }
        
        조건:
        - characters 배열에는 인물 이름을 반드시 "극중 인물명(배우명)" 형식으로 작성해 주세요. 예: "한필주(이성민)"
        - 감독 이름은 "감독 이름" 형태로 "director" 필드에 넣어 주세요. 예: "박찬욱"
        - 질문에 "최근", "요즘", "지금", "실시간", "핫한" 등의 표현이 있다면 realtimeInfo 필드를 채워 주세요.
        - 영화일 경우: https://www.moviechart.co.kr/rank/boxoffice 기준
        - TV/OTT일 경우: https://www.fundex.co.kr/fxmain.do 기준
        - Elasticsearch 쿼리는 키워드들을 콤마(,)로 연결하며 공백은 유지하세요.
        - 절대로 마크다운 코드 블록 (\`\`\`)이나 [source], [출처] 같은 문구는 포함하지 마세요.
        
        예시 질문: 이 장면은 어떤 영화인가요? 등장인물은 누구인가요?
        `;
        
        
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                        { text: prompt }
                    ]
                }
            ]
        });

        const reply = result.response.text();
        fs.unlinkSync(filePath); // 업로드된 파일 삭제
        res.json({ reply });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gemini 처리 중 오류 발생' });
    }
});

app.listen(port, () => {
    console.log(`✅ 서버 실행 중: http://localhost:${port}`);
});
