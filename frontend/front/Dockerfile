FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
RUN mkdir -p /app/uploads


COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]




# # Vite로 빌드한 후, Nginx로 정적 사이트를 띄우는 도커 설정
# 아래는 후에 배포할때 사용할 것임 
# FROM node:20 AS build
# WORKDIR /app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build


# FROM nginx:1.27
# COPY --from=build /app/dist /usr/share/nginx/html
# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]
