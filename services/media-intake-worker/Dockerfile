FROM node:22-slim

WORKDIR /srv
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY index.mjs ./

ENV NODE_ENV=production
CMD ["npm", "start"]
