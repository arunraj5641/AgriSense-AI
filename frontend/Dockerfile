FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies (if package.json is present)
# If not, the volume mount will provide it during development
RUN if [ -f "package.json" ]; then npm install; fi

COPY . .

CMD ["npm", "run", "dev"]
