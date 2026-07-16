FROM node:20-alpine

WORKDIR /app

# Alpine Prisma 호환성을 위한 패키지 설치
RUN apk add --no-cache openssl libc6-compat

# npm 의존성 설치
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# 소스코드 복사
COPY . .

# Prisma Client 생성
RUN npx prisma generate

# 빌드
RUN npm run build

# 포트 개방
EXPOSE 8000

# 서버 실행
CMD ["npm", "run", "start:prod"]
