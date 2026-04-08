import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = dirname(__filename);
const distDir = join(projectRoot, 'dist');
const dataDir = join(projectRoot, 'data');
const dbPath = join(dataDir, 'task-manager-vue.sqlite');
const jwtSecretPath = join(dataDir, 'jwt-secret.txt');
const port = Number(process.env.PORT || 3003);
const apiOnly = process.argv.includes('--api-only');
const refreshTokenCookieName = 'task_refresh_token';

mkdirSync(dataDir, { recursive: true });

const ensureJwtSecret = () => {
  if (existsSync(jwtSecretPath)) {
    return readFileSync(jwtSecretPath, 'utf8').trim();
  }

  const secret = randomBytes(64).toString('hex');
  writeFileSync(jwtSecretPath, secret, 'utf8');
  return secret;
};

const jwtSecret = ensureJwtSecret();
const accessTokenLifetimeSeconds = 60 * 15;
const refreshTokenLifetimeSeconds = 60 * 60 * 24 * 7;

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti TEXT PRIMARY KEY,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    revoked_at TEXT,
    replaced_by_token_hash TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
  ON refresh_tokens(user_id);

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    category_name TEXT NOT NULL,
    category_sort INTEGER NOT NULL DEFAULT 0,
    tag TEXT,
    sync_dt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS priorities (
    id TEXT PRIMARY KEY,
    priority_name TEXT NOT NULL,
    priority_sort INTEGER NOT NULL DEFAULT 0,
    sync_dt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    task_name TEXT NOT NULL,
    task_sort INTEGER NOT NULL DEFAULT 0,
    created_dt TEXT NOT NULL,
    due_dt TEXT,
    is_completed INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    todo_category_id TEXT NOT NULL,
    todo_priority_id TEXT NOT NULL,
    sync_dt TEXT NOT NULL,
    FOREIGN KEY(todo_category_id) REFERENCES categories(id),
    FOREIGN KEY(todo_priority_id) REFERENCES priorities(id)
  );
`);

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const nowIso = () => new Date().toISOString();
const toIsoAfterSeconds = (seconds) => new Date(Date.now() + seconds * 1000).toISOString();

const base64UrlEncode = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');

const base64UrlDecode = (input) => {
  const normalized = input.replaceAll('-', '+').replaceAll('_', '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64');
};

const hashRefreshToken = (token) => createHash('sha256').update(token).digest('hex');

const signJwt = (payload) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();

  return `${encodedHeader}.${encodedPayload}.${base64UrlEncode(signature)}`;
};

const verifyJwt = (token) => {
  if (typeof token !== 'string') {
    throw new Error('Token is missing.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token format is invalid.');
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const expectedSignature = createHmac('sha256', jwtSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest();
  const providedSignature = base64UrlDecode(encodedSignature);

  if (
    expectedSignature.length !== providedSignature.length ||
    !timingSafeEqual(expectedSignature, providedSignature)
  ) {
    throw new Error('Token signature is invalid.');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) {
    throw new Error('Token has expired.');
  }

  return payload;
};

const buildAccessToken = (user) => {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + accessTokenLifetimeSeconds;
  const payload = {
    email: user.email,
    exp: expiresAt,
    firstName: user.first_name,
    iat: issuedAt,
    jti: randomUUID(),
    lastName: user.last_name,
    sub: user.id,
  };

  return signJwt(payload);
};

const toUserInfo = (user, token) => ({
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  token,
});

const createRefreshTokenRecord = (userId) => {
  const createdAt = nowIso();
  const expiresAt = toIsoAfterSeconds(refreshTokenLifetimeSeconds);
  const refreshToken = randomBytes(48).toString('hex');
  const tokenHash = hashRefreshToken(refreshToken);

  return { createdAt, expiresAt, refreshToken, tokenHash, userId };
};

const runInTransaction = (operation) => {
  db.exec('BEGIN IMMEDIATE');

  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

const revokeRefreshTokenChain = (tokenHash) => {
  let currentTokenHash = tokenHash;
  const revokedAt = nowIso();

  while (currentTokenHash) {
    const refreshTokenRecord = statements.getRefreshTokenByHash.get(currentTokenHash);
    if (!refreshTokenRecord) {
      break;
    }

    if (!refreshTokenRecord.revoked_at) {
      statements.revokeRefreshToken.run(revokedAt, null, currentTokenHash);
    }

    currentTokenHash = refreshTokenRecord.replaced_by_token_hash;
  }
};

const issueAuthSession = (user) => {
  const token = buildAccessToken(user);
  const refreshTokenRecord = createRefreshTokenRecord(user.id);
  statements.insertRefreshToken.run(
    refreshTokenRecord.tokenHash,
    refreshTokenRecord.userId,
    refreshTokenRecord.expiresAt,
    refreshTokenRecord.createdAt,
  );

  return {
    refreshToken: refreshTokenRecord.refreshToken,
    userInfo: toUserInfo(user, token),
  };
};

const rotateRefreshToken = (user, currentTokenHash) => {
  const token = buildAccessToken(user);
  const nextRefreshTokenRecord = createRefreshTokenRecord(user.id);
  statements.revokeRefreshToken.run(
    nextRefreshTokenRecord.createdAt,
    nextRefreshTokenRecord.tokenHash,
    currentTokenHash,
  );
  statements.insertRefreshToken.run(
    nextRefreshTokenRecord.tokenHash,
    nextRefreshTokenRecord.userId,
    nextRefreshTokenRecord.expiresAt,
    nextRefreshTokenRecord.createdAt,
  );

  return {
    refreshToken: nextRefreshTokenRecord.refreshToken,
    userInfo: toUserInfo(user, token),
  };
};

const validateRefreshToken = (refreshToken) => {
  const tokenHash = hashRefreshToken(refreshToken);
  const refreshTokenRecord = statements.getRefreshTokenByHash.get(tokenHash);
  if (!refreshTokenRecord) {
    throw new Error('Refresh token is invalid.');
  }

  if (refreshTokenRecord.revoked_at) {
    if (refreshTokenRecord.replaced_by_token_hash) {
      revokeRefreshTokenChain(refreshTokenRecord.replaced_by_token_hash);
    }
    throw new Error('Refresh token is no longer valid.');
  }

  if (Date.parse(refreshTokenRecord.expires_at) <= Date.now()) {
    statements.revokeRefreshToken.run(nowIso(), null, tokenHash);
    throw new Error('Refresh token has expired.');
  }

  const user = statements.getUserById.get(refreshTokenRecord.user_id);
  if (!user) {
    throw new Error('User was not found.');
  }

  return { tokenHash, user };
};

const revokeAccessToken = (payload) => {
  const expiresAt = new Date(payload.exp * 1000).toISOString();
  statements.insertRevokedToken.run(payload.jti, expiresAt);
};

const hashPassword = (password, salt) => scryptSync(password, salt, 64).toString('hex');

const toCategory = (row) => ({
  id: row.id,
  categoryName: row.category_name,
  categorySort: row.category_sort,
  syncDt: row.sync_dt,
  tag: row.tag,
});

const toPriority = (row) => ({
  id: row.id,
  priorityName: row.priority_name,
  prioritySort: row.priority_sort,
  syncDt: row.sync_dt,
});

const toTask = (row) => ({
  id: row.id,
  taskName: row.task_name,
  taskSort: row.task_sort,
  createdDt: row.created_dt,
  dueDt: row.due_dt,
  isCompleted: Boolean(row.is_completed),
  isArchived: Boolean(row.is_archived),
  todoCategoryId: row.todo_category_id,
  todoPriorityId: row.todo_priority_id,
  syncDt: row.sync_dt,
});

const statements = {
  categoryCount: db.prepare('SELECT COUNT(*) AS count FROM categories'),
  deleteCategory: db.prepare('DELETE FROM categories WHERE id = ?'),
  deletePriority: db.prepare('DELETE FROM priorities WHERE id = ?'),
  deleteTask: db.prepare('DELETE FROM tasks WHERE id = ?'),
  getUserByEmail: db.prepare(`
    SELECT id, email, first_name, last_name, password_hash, password_salt, created_at
    FROM users
    WHERE lower(email) = lower(?)
  `),
  getUserById: db.prepare(`
    SELECT id, email, first_name, last_name, password_hash, password_salt, created_at
    FROM users
    WHERE id = ?
  `),
  getCategoryById: db.prepare(`
    SELECT id, category_name, category_sort, tag, sync_dt
    FROM categories
    WHERE id = ?
  `),
  getPriorityById: db.prepare(`
    SELECT id, priority_name, priority_sort, sync_dt
    FROM priorities
    WHERE id = ?
  `),
  getRefreshTokenByHash: db.prepare(`
    SELECT token_hash, user_id, expires_at, created_at, revoked_at, replaced_by_token_hash
    FROM refresh_tokens
    WHERE token_hash = ?
  `),
  getTaskById: db.prepare(`
    SELECT id, task_name, task_sort, created_dt, due_dt, is_completed, is_archived,
           todo_category_id, todo_priority_id, sync_dt
    FROM tasks
    WHERE id = ?
  `),
  insertCategory: db.prepare(`
    INSERT INTO categories (id, category_name, category_sort, tag, sync_dt)
    VALUES (?, ?, ?, ?, ?)
  `),
  insertRevokedToken: db.prepare(`
    INSERT OR REPLACE INTO revoked_tokens (jti, expires_at)
    VALUES (?, ?)
  `),
  insertPriority: db.prepare(`
    INSERT INTO priorities (id, priority_name, priority_sort, sync_dt)
    VALUES (?, ?, ?, ?)
  `),
  insertRefreshToken: db.prepare(`
    INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `),
  insertTask: db.prepare(`
    INSERT INTO tasks (
      id, task_name, task_sort, created_dt, due_dt, is_completed, is_archived,
      todo_category_id, todo_priority_id, sync_dt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  insertUser: db.prepare(`
    INSERT INTO users (id, email, first_name, last_name, password_hash, password_salt, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  isTokenRevoked: db.prepare('SELECT 1 AS found FROM revoked_tokens WHERE jti = ?'),
  listCategories: db.prepare(`
    SELECT id, category_name, category_sort, tag, sync_dt
    FROM categories
    ORDER BY category_sort ASC, category_name ASC
  `),
  listPriorities: db.prepare(`
    SELECT id, priority_name, priority_sort, sync_dt
    FROM priorities
    ORDER BY priority_sort ASC, priority_name ASC
  `),
  listTasks: db.prepare(`
    SELECT id, task_name, task_sort, created_dt, due_dt, is_completed, is_archived,
           todo_category_id, todo_priority_id, sync_dt
    FROM tasks
    ORDER BY is_completed ASC, task_sort ASC, datetime(created_dt) DESC
  `),
  priorityCount: db.prepare('SELECT COUNT(*) AS count FROM priorities'),
  purgeExpiredRefreshTokens: db.prepare(`
    DELETE FROM refresh_tokens
    WHERE datetime(expires_at) <= datetime(?)
  `),
  purgeExpiredRevocations: db.prepare('DELETE FROM revoked_tokens WHERE datetime(expires_at) <= datetime(?)'),
  revokeRefreshToken: db.prepare(`
    UPDATE refresh_tokens
    SET revoked_at = ?, replaced_by_token_hash = COALESCE(?, replaced_by_token_hash)
    WHERE token_hash = ?
  `),
  tasksUsingCategory: db.prepare('SELECT COUNT(*) AS count FROM tasks WHERE todo_category_id = ?'),
  tasksUsingPriority: db.prepare('SELECT COUNT(*) AS count FROM tasks WHERE todo_priority_id = ?'),
  updateCategory: db.prepare(`
    UPDATE categories
    SET category_name = ?, category_sort = ?, tag = ?, sync_dt = ?
    WHERE id = ?
  `),
  updatePriority: db.prepare(`
    UPDATE priorities
    SET priority_name = ?, priority_sort = ?, sync_dt = ?
    WHERE id = ?
  `),
  updateTask: db.prepare(`
    UPDATE tasks
    SET task_name = ?, task_sort = ?, due_dt = ?, is_completed = ?, is_archived = ?,
        todo_category_id = ?, todo_priority_id = ?, sync_dt = ?
    WHERE id = ?
  `),
};

const ensureSeedData = () => {
  const categoryCount = statements.categoryCount.get().count;
  const priorityCount = statements.priorityCount.get().count;

  if (categoryCount === 0) {
    const syncDt = nowIso();
    statements.insertCategory.run('work', 'Work', 10, 'office', syncDt);
    statements.insertCategory.run('personal', 'Personal', 20, 'home', syncDt);
    statements.insertCategory.run('study', 'Study', 30, 'learning', syncDt);
  }

  if (priorityCount === 0) {
    const syncDt = nowIso();
    statements.insertPriority.run('low', 'Low', 10, syncDt);
    statements.insertPriority.run('medium', 'Medium', 20, syncDt);
    statements.insertPriority.run('high', 'High', 30, syncDt);
  }
};

ensureSeedData();
statements.purgeExpiredRevocations.run(nowIso());
statements.purgeExpiredRefreshTokens.run(nowIso());

const readBody = (request) =>
  new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Request body is too large.'));
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });

const isSecureCookieRequest = (request) =>
  request.socket.encrypted || request.headers['x-forwarded-proto'] === 'https';

const buildRefreshTokenCookie = (request, refreshToken, maxAgeSeconds) => {
  const attributes = [
    `${refreshTokenCookieName}=${encodeURIComponent(refreshToken)}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/api/v1/Account',
    `Max-Age=${maxAgeSeconds}`,
  ];

  if (maxAgeSeconds === 0) {
    attributes.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }

  if (isSecureCookieRequest(request)) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
};

const setRefreshTokenCookie = (request, response, refreshToken) => {
  response.setHeader(
    'Set-Cookie',
    buildRefreshTokenCookie(request, refreshToken, refreshTokenLifetimeSeconds),
  );
};

const clearRefreshTokenCookie = (request, response) => {
  response.setHeader(
    'Set-Cookie',
    buildRefreshTokenCookie(request, '', 0),
  );
};

const parseCookies = (request) => {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf('=');
        if (separatorIndex === -1) {
          return [entry, ''];
        }

        const key = entry.slice(0, separatorIndex).trim();
        const value = entry.slice(separatorIndex + 1).trim();
        return [key, decodeURIComponent(value)];
      }),
  );
};

const readRefreshTokenFromCookie = (request) => {
  const cookies = parseCookies(request);
  return cookies[refreshTokenCookieName] || null;
};

const extractRefreshTokenFromCookie = (request) => {
  const refreshToken = readRefreshTokenFromCookie(request);
  if (!refreshToken) {
    throw new Error('Refresh token cookie is missing.');
  }

  return refreshToken;
};

const sendJson = (response, statusCode, payload, headers = {}) => {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(JSON.stringify(payload));
};

const sendError = (response, statusCode, message, headers = {}) => {
  sendJson(response, statusCode, { message }, headers);
};

const sendAuthJson = (response, statusCode, payload) => {
  sendJson(response, statusCode, payload, {
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
  });
};

const parseJsonBody = async (request) => {
  const rawBody = await readBody(request);
  return rawBody ? JSON.parse(rawBody) : null;
};

const extractBearerToken = (request) => {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new Error('Authorization header is missing.');
  }

  return header.slice('Bearer '.length).trim();
};

const authenticateRequest = (request) => {
  const token = extractBearerToken(request);
  const payload = verifyJwt(token);
  if (!payload.jti || statements.isTokenRevoked.get(payload.jti)) {
    throw new Error('Token is no longer valid.');
  }

  const user = statements.getUserById.get(payload.sub);
  if (!user) {
    throw new Error('User was not found.');
  }

  return { payload, user };
};

const parseRegisterPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Register payload must be an object.');
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';
  const firstName = typeof payload.firstName === 'string' ? payload.firstName.trim() : '';
  const lastName = typeof payload.lastName === 'string' ? payload.lastName.trim() : '';

  if (!email || !email.includes('@')) {
    throw new Error('Valid email is required.');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
  if (!firstName) {
    throw new Error('First name is required.');
  }
  if (!lastName) {
    throw new Error('Last name is required.');
  }

  return { email, firstName, lastName, password };
};

const parseLoginPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Login payload must be an object.');
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  return { email, password };
};

const parseCategoryPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Category payload must be an object.');
  }

  const categoryName = typeof payload.categoryName === 'string' ? payload.categoryName.trim() : '';
  if (!categoryName) throw new Error('Category name is required.');

  const generatedId = categoryName.toLowerCase().replace(/\s+/g, '-');

  return {
    categoryName,
    categorySort: Number.isFinite(Number(payload.categorySort)) ? Number(payload.categorySort) : 0,
    id:
      typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : generatedId,
    syncDt: nowIso(),
    tag: typeof payload.tag === 'string' && payload.tag.trim() ? payload.tag.trim() : null,
  };
};

const parsePriorityPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Priority payload must be an object.');
  }

  const priorityName = typeof payload.priorityName === 'string' ? payload.priorityName.trim() : '';
  if (!priorityName) throw new Error('Priority name is required.');

  const generatedId = priorityName.toLowerCase().replace(/\s+/g, '-');

  return {
    id:
      typeof payload.id === 'string' && payload.id.trim() ? payload.id.trim() : generatedId,
    priorityName,
    prioritySort: Number.isFinite(Number(payload.prioritySort)) ? Number(payload.prioritySort) : 0,
    syncDt: nowIso(),
  };
};

const parseTaskPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Task payload must be an object.');
  }

  const taskName = typeof payload.taskName === 'string' ? payload.taskName.trim() : '';
  if (!taskName) throw new Error('Task name is required.');
  if (typeof payload.todoCategoryId !== 'string' || !payload.todoCategoryId.trim()) {
    throw new Error('Task category is required.');
  }
  if (typeof payload.todoPriorityId !== 'string' || !payload.todoPriorityId.trim()) {
    throw new Error('Task priority is required.');
  }

  return {
    createdDt:
      typeof payload.createdDt === 'string' && payload.createdDt ? payload.createdDt : nowIso(),
    dueDt: typeof payload.dueDt === 'string' && payload.dueDt ? payload.dueDt : null,
    id:
      typeof payload.id === 'string' && payload.id.trim()
        ? payload.id.trim()
        : randomUUID(),
    isArchived: Boolean(payload.isArchived),
    isCompleted: Boolean(payload.isCompleted),
    syncDt: nowIso(),
    taskName,
    taskSort: Number.isFinite(Number(payload.taskSort)) ? Number(payload.taskSort) : 0,
    todoCategoryId: payload.todoCategoryId.trim(),
    todoPriorityId: payload.todoPriorityId.trim(),
  };
};

const ensureReferencesExist = (task) => {
  if (!statements.getCategoryById.get(task.todoCategoryId)) {
    throw new Error('Selected category does not exist.');
  }

  if (!statements.getPriorityById.get(task.todoPriorityId)) {
    throw new Error('Selected priority does not exist.');
  }
};

const serveSpaAsset = (pathname, response) => {
  if (apiOnly) {
    sendError(response, 404, 'Not found.');
    return;
  }

  if (!existsSync(distDir)) {
    sendError(response, 500, 'Build output was not found. Run npm run build first.');
    return;
  }

  const requestedPath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const candidate = normalize(join(distDir, requestedPath));
  const fallback = join(distDir, 'index.html');

  let filePath = fallback;
  if (candidate.startsWith(distDir) && existsSync(candidate)) {
    try {
      if (statSync(candidate).isFile()) {
        filePath = candidate;
      }
    } catch {
      filePath = fallback;
    }
  }

  const extension = extname(filePath);
  const contentType = mimeTypes[extension] || 'application/octet-stream';
  const contents = readFileSync(filePath);
  response.writeHead(200, { 'Content-Type': contentType });
  response.end(contents);
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const { pathname } = url;

  try {
    if (pathname === '/api/v1/Account/Register' && request.method === 'POST') {
      const payload = parseRegisterPayload(await parseJsonBody(request));
      if (statements.getUserByEmail.get(payload.email)) {
        sendError(response, 400, 'A user with this email already exists.');
        return;
      }

      const salt = randomBytes(16).toString('hex');
      const user = {
        createdAt: nowIso(),
        email: payload.email,
        firstName: payload.firstName,
        id: randomUUID(),
        lastName: payload.lastName,
        passwordHash: hashPassword(payload.password, salt),
        passwordSalt: salt,
      };

      statements.insertUser.run(
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        user.passwordHash,
        user.passwordSalt,
        user.createdAt,
      );

      const session = issueAuthSession({
        email: user.email,
        first_name: user.firstName,
        id: user.id,
        last_name: user.lastName,
      });
      setRefreshTokenCookie(request, response, session.refreshToken);
      sendAuthJson(response, 201, session.userInfo);
      return;
    }

    if (pathname === '/api/v1/Account/Login' && request.method === 'POST') {
      const payload = parseLoginPayload(await parseJsonBody(request));
      const user = statements.getUserByEmail.get(payload.email);
      if (!user) {
        sendError(response, 401, 'Invalid email or password.');
        return;
      }

      const expectedHash = hashPassword(payload.password, user.password_salt);
      const expectedBuffer = Buffer.from(expectedHash, 'hex');
      const actualBuffer = Buffer.from(user.password_hash, 'hex');
      if (
        expectedBuffer.length !== actualBuffer.length ||
        !timingSafeEqual(expectedBuffer, actualBuffer)
      ) {
        sendError(response, 401, 'Invalid email or password.');
        return;
      }

      const session = issueAuthSession(user);
      setRefreshTokenCookie(request, response, session.refreshToken);
      sendAuthJson(response, 200, session.userInfo);
      return;
    }

    if (pathname === '/api/v1/Account/RefreshToken' && request.method === 'POST') {
      const session = runInTransaction(() => {
        const { tokenHash, user } = validateRefreshToken(
          extractRefreshTokenFromCookie(request),
        );
        return rotateRefreshToken(user, tokenHash);
      });

      setRefreshTokenCookie(request, response, session.refreshToken);
      sendAuthJson(response, 200, session.userInfo);
      return;
    }

    if (pathname === '/api/v1/Account/Me' && request.method === 'GET') {
      const { user } = authenticateRequest(request);
      sendAuthJson(response, 200, {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      });
      return;
    }

    if (pathname === '/api/v1/Account/Logout' && request.method === 'POST') {
      const { payload } = authenticateRequest(request);
      const refreshToken = readRefreshTokenFromCookie(request);

      runInTransaction(() => {
        revokeAccessToken(payload);

        if (refreshToken) {
          revokeRefreshTokenChain(hashRefreshToken(refreshToken));
        }
      });

      clearRefreshTokenCookie(request, response);
      sendAuthJson(response, 200, { success: true });
      return;
    }

    const isProtectedRoute =
      pathname.startsWith('/api/v1/TodoCategories') ||
      pathname.startsWith('/api/v1/TodoPriorities') ||
      pathname.startsWith('/api/v1/TodoTasks');

    if (isProtectedRoute) {
      authenticateRequest(request);
    }

    if (pathname === '/api/v1/TodoCategories' && request.method === 'GET') {
      sendJson(response, 200, statements.listCategories.all().map(toCategory));
      return;
    }

    if (pathname.startsWith('/api/v1/TodoCategories/') && request.method === 'GET') {
      const id = decodeURIComponent(pathname.slice('/api/v1/TodoCategories/'.length));
      const category = statements.getCategoryById.get(id);
      if (!category) {
        sendError(response, 404, 'Category not found.');
        return;
      }
      sendJson(response, 200, toCategory(category));
      return;
    }

    if (pathname === '/api/v1/TodoCategories' && request.method === 'POST') {
      const category = parseCategoryPayload(await parseJsonBody(request));
      statements.insertCategory.run(
        category.id,
        category.categoryName,
        category.categorySort,
        category.tag,
        category.syncDt,
      );
      sendJson(response, 201, category);
      return;
    }

    if (pathname.startsWith('/api/v1/TodoCategories/') && request.method === 'PUT') {
      const id = decodeURIComponent(pathname.slice('/api/v1/TodoCategories/'.length));
      if (!statements.getCategoryById.get(id)) {
        sendError(response, 404, 'Category not found.');
        return;
      }

      const category = parseCategoryPayload({ ...(await parseJsonBody(request)), id });
      statements.updateCategory.run(
        category.categoryName,
        category.categorySort,
        category.tag,
        category.syncDt,
        id,
      );
      sendJson(response, 200, category);
      return;
    }

    if (pathname.startsWith('/api/v1/TodoCategories/') && request.method === 'DELETE') {
      const id = decodeURIComponent(pathname.slice('/api/v1/TodoCategories/'.length));
      if (statements.tasksUsingCategory.get(id).count > 0) {
        sendError(response, 400, 'Delete tasks that use this category first.');
        return;
      }
      const result = statements.deleteCategory.run(id);
      if (result.changes === 0) {
        sendError(response, 404, 'Category not found.');
        return;
      }
      sendJson(response, 200, { deletedId: id });
      return;
    }

    if (pathname === '/api/v1/TodoPriorities' && request.method === 'GET') {
      sendJson(response, 200, statements.listPriorities.all().map(toPriority));
      return;
    }

    if (pathname.startsWith('/api/v1/TodoPriorities/') && request.method === 'GET') {
      const id = decodeURIComponent(pathname.slice('/api/v1/TodoPriorities/'.length));
      const priority = statements.getPriorityById.get(id);
      if (!priority) {
        sendError(response, 404, 'Priority not found.');
        return;
      }
      sendJson(response, 200, toPriority(priority));
      return;
    }

    if (pathname === '/api/v1/TodoPriorities' && request.method === 'POST') {
      const priority = parsePriorityPayload(await parseJsonBody(request));
      statements.insertPriority.run(
        priority.id,
        priority.priorityName,
        priority.prioritySort,
        priority.syncDt,
      );
      sendJson(response, 201, priority);
      return;
    }

    if (pathname.startsWith('/api/v1/TodoPriorities/') && request.method === 'PUT') {
      const id = decodeURIComponent(pathname.slice('/api/v1/TodoPriorities/'.length));
      if (!statements.getPriorityById.get(id)) {
        sendError(response, 404, 'Priority not found.');
        return;
      }

      const priority = parsePriorityPayload({ ...(await parseJsonBody(request)), id });
      statements.updatePriority.run(
        priority.priorityName,
        priority.prioritySort,
        priority.syncDt,
        id,
      );
      sendJson(response, 200, priority);
      return;
    }

    if (pathname.startsWith('/api/v1/TodoPriorities/') && request.method === 'DELETE') {
      const id = decodeURIComponent(pathname.slice('/api/v1/TodoPriorities/'.length));
      if (statements.tasksUsingPriority.get(id).count > 0) {
        sendError(response, 400, 'Delete tasks that use this priority first.');
        return;
      }
      const result = statements.deletePriority.run(id);
      if (result.changes === 0) {
        sendError(response, 404, 'Priority not found.');
        return;
      }
      sendJson(response, 200, { deletedId: id });
      return;
    }

    if (pathname === '/api/v1/TodoTasks' && request.method === 'GET') {
      sendJson(response, 200, statements.listTasks.all().map(toTask));
      return;
    }

    if (pathname.startsWith('/api/v1/TodoTasks/') && request.method === 'GET') {
      const id = decodeURIComponent(pathname.slice('/api/v1/TodoTasks/'.length));
      const task = statements.getTaskById.get(id);
      if (!task) {
        sendError(response, 404, 'Task not found.');
        return;
      }
      sendJson(response, 200, toTask(task));
      return;
    }

    if (pathname === '/api/v1/TodoTasks' && request.method === 'POST') {
      const task = parseTaskPayload(await parseJsonBody(request));
      ensureReferencesExist(task);
      statements.insertTask.run(
        task.id,
        task.taskName,
        task.taskSort,
        task.createdDt,
        task.dueDt,
        task.isCompleted ? 1 : 0,
        task.isArchived ? 1 : 0,
        task.todoCategoryId,
        task.todoPriorityId,
        task.syncDt,
      );
      sendJson(response, 201, task);
      return;
    }

    if (pathname.startsWith('/api/v1/TodoTasks/') && request.method === 'PUT') {
      const id = decodeURIComponent(pathname.slice('/api/v1/TodoTasks/'.length));
      const existingTask = statements.getTaskById.get(id);
      if (!existingTask) {
        sendError(response, 404, 'Task not found.');
        return;
      }

      const task = parseTaskPayload({
        ...(await parseJsonBody(request)),
        id,
        createdDt: existingTask.created_dt,
      });
      ensureReferencesExist(task);
      statements.updateTask.run(
        task.taskName,
        task.taskSort,
        task.dueDt,
        task.isCompleted ? 1 : 0,
        task.isArchived ? 1 : 0,
        task.todoCategoryId,
        task.todoPriorityId,
        task.syncDt,
        id,
      );
      sendJson(response, 200, task);
      return;
    }

    if (pathname.startsWith('/api/v1/TodoTasks/') && request.method === 'DELETE') {
      const id = decodeURIComponent(pathname.slice('/api/v1/TodoTasks/'.length));
      const result = statements.deleteTask.run(id);
      if (result.changes === 0) {
        sendError(response, 404, 'Task not found.');
        return;
      }
      sendJson(response, 200, { deletedId: id });
      return;
    }

    serveSpaAsset(pathname, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request.';
    const refreshCookieErrors = new Set([
      'Refresh token cookie is missing.',
      'Refresh token has expired.',
      'Refresh token is invalid.',
      'Refresh token is no longer valid.',
    ]);
    const unauthorizedErrors = new Set([
      'Authorization header is missing.',
      'Refresh token cookie is missing.',
      'Refresh token has expired.',
      'Refresh token is invalid.',
      'Refresh token is no longer valid.',
      'Token format is invalid.',
      'Token has expired.',
      'Token is missing.',
      'Token is no longer valid.',
      'Token signature is invalid.',
      'User was not found.',
    ]);

    if (refreshCookieErrors.has(message)) {
      clearRefreshTokenCookie(request, response);
    }

    sendError(response, unauthorizedErrors.has(message) ? 401 : 400, message, {
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
    });
  }
});

server.listen(port, () => {
  console.log(
    `task-manager-vue ${apiOnly ? 'API' : 'app'} running at http://localhost:${port}`,
  );
});
