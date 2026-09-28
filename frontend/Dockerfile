# Gunakan image Node.js ringan (standar untuk React/Vue/Vite)
FROM node:18-alpine

# Set direktori kerja di dalam kontainer
WORKDIR /app

# Karena file Sovia belum lengkap, kita buat mock package.json agar build tidak error
RUN echo '{"name": "cura-frontend", "version": "1.0.0", "scripts": {"dev": "echo \"Frontend Ready!\" && sleep infinity"}}' > package.json

# Install dependencies (akan mengeksekusi package.json buatan kita di atas)
RUN npm install

# Salin sisa kode frontend ke dalam kontainer
COPY . .

# Ekspos port 3000 (port standar frontend)
EXPOSE 3000

# Perintah agar kontainer terus menyala dan siap untuk development
CMD ["npm", "run", "dev"]