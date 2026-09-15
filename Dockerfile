# --- Závislosti ---
# better-sqlite3 vyžaduje Node.js 22+, proto stejnou verzi
# používáme ve všech fázích buildu i za běhu.
FROM node:22-alpine AS deps
WORKDIR /app
# better-sqlite3 je nativní modul -- potřebuje se při instalaci
# zkompilovat, na což Alpine potřebuje tyto nástroje.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

# --- Build ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Běh aplikace ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000

# Next.js standalone server čte HOSTNAME z prostředí a poslouchá
# jen na té adrese. Kubernetes/Docker runtime ale HOSTNAME sám
# nastavuje na název kontejneru/podu, což by server svázalo jen
# s tímto interním jménem (nedostupné přes 127.0.0.1/0.0.0.0).
# Proto ho tady natvrdo přebijeme těsně před spuštěním.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 node server.js"]
