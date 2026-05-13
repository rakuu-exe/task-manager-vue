# Task Manager Vue

## Mis see projekt on
See on Vue 3 + TypeScript task manager, kus saab hallata kategooriaid, prioriteete ja ulesandeid. Rakendus kasutab kohalikku REST API-t, luhiajalisi JWT access tokeneid, roteeruvaid refresh tokeneid ning salvestab kogu info lokaalsesse SQLite faili `data/task-manager-vue.sqlite`. Refresh token hoitakse turvalisemalt `httpOnly` cookie sees, mitte frontendi salvestuses.

## Millega see ehitati
- Vue 3
- TypeScript
- Pinia
- Vue Router
- Axios
- Vite
- Node.js sisseehitatud `node:sqlite`

## Kuidas kaima panna
### Lihtsaim viis
1. Ava terminal selles kaustas:
   `cd task-manager-vue`
2. Paigalda soltuvused:
   `npm install`
3. Kaivita rakendus:
   `npm start`
4. Ava brauseris:
   `http://localhost:3003`

### Arendusreziim
1. Terminal 1:
   `npm run api`
2. Terminal 2:
   `npm run dev`
3. Ava Vite aadress, mille terminal kuvab.

### Dockeriga
1. Ehita ja kaivita konteiner:
   `docker compose up --build`
2. Ava brauseris:
   `http://localhost:3003`
3. Andmebaas ja JWT saladus hoitakse Docker volume'is `task-manager-vue-data`.

Kui tahad konteineri taustal kaima panna:
`docker compose up -d --build`

## Mida siin ehitati
- Register ja login vaated
- Logout voog
- JWT access token + refresh token autentimine
- Refresh token `httpOnly` cookie sees
- Dashboard
- Kategooriate CRUD
- Prioriteetide CRUD
- Ulesannete CRUD
- Kohalik REST API SQLite peal
- Kaitstud endpointid kategooriate, prioriteetide ja ulesannete jaoks
- Refresh token roteerimine ja logouti ajal sessiooni sulgemine

## Tulemus / eesmark
Eesmark oli muuta Vue projekt iseseisvaks lokaalseks rakenduseks, millel on paris auth-kiht. Tulemus on kohaliku SQLite andmebaasi, JWT access tokenite ja roteeruvate refresh tokenitega Vue SPA, kus refresh token on viidud `httpOnly` cookie peale ja rakendus jookseb ilma valise backendita.
