const { createServer } = require("http");
const crypto = require("crypto");

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const ISSUER = "https://auth.openai.com";
const OAUTH_PORT = 1455;

class OAuthManager {
  constructor() {
    this.server = null;
    this.pendingAuth = null;
    this.sockets = new Set();
  }

  generatePKCE() {
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
  }

  generateState() {
    return crypto.randomBytes(16).toString('hex');
  }

  async exchangeCode(code, verifier) {
    const response = await fetch(`${ISSUER}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `http://localhost:${OAUTH_PORT}/auth/callback`,
        client_id: CLIENT_ID,
        code_verifier: verifier,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }

  async startServer() {
    if (this.server) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        const urlObj = new URL(req.url, `http://localhost:${OAUTH_PORT}`);
        
        if (urlObj.pathname === "/auth/callback") {
          const code = urlObj.searchParams.get("code");
          const incomingState = urlObj.searchParams.get("state");
          const error = urlObj.searchParams.get("error");
          const errorDesc = urlObj.searchParams.get("error_description");

          if (error) {
             res.writeHead(400, { "Content-Type": "text/html" });
             res.end(`<h1>Error</h1><p>${errorDesc || error}</p>`);
             if (this.pendingAuth) {
                this.pendingAuth.reject(new Error(errorDesc || error));
                this.pendingAuth = null;
             }
             return;
          }

          if (this.pendingAuth) {
             if (incomingState !== this.pendingAuth.state) {
               res.writeHead(400, { "Content-Type": "text/html" });
               res.end("Invalid state - potential CSRF attack");
               this.pendingAuth.reject(new Error("Invalid state"));
               this.pendingAuth = null;
               return;
             }
             if (code) {
               res.writeHead(200, { "Content-Type": "text/html" });
               res.end("<h1>Success</h1><p>You can close this window and return to the application.</p><script>setTimeout(() => window.close(), 2000)</script>");               
               const pkce = this.pendingAuth.pkce;
               const resolvePending = this.pendingAuth.resolve;
               const rejectPending = this.pendingAuth.reject;
               this.pendingAuth = null;

               this.exchangeCode(code, pkce.verifier)
                 .then(tokens => {
                    let accountId;
                    const getClaims = (token) => {
                       try { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()); } catch { return null; }
                    };
                    const getAcc = (claims) => claims && (claims.chatgpt_account_id || claims["https://api.openai.com/auth"]?.chatgpt_account_id || claims.organizations?.[0]?.id);
                    if (tokens.id_token) accountId = getAcc(getClaims(tokens.id_token));
                    if (!accountId && tokens.access_token) accountId = getAcc(getClaims(tokens.access_token));
                    resolvePending({ code, accessToken: tokens.access_token, accountId });
                 })
                 .catch(err => rejectPending(err));
             } else {
               res.writeHead(400, { "Content-Type": "text/html" });
               res.end("Authorization failed");
               this.pendingAuth.reject(new Error("No code received"));
               this.pendingAuth = null;
             }
          } else {
             res.writeHead(400, { "Content-Type": "text/html" });
             res.end("No pending authorization");
          }
        } else {
          res.writeHead(404);
          res.end("Not found");
        }
      });

      this.server.on('connection', (socket) => {
        this.sockets.add(socket);
        socket.on('close', () => this.sockets.delete(socket));
      });

      this.server.on('error', (err) => {
         this.server = null;
         reject(err);
      });

      this.server.listen(OAUTH_PORT, () => {
        console.log(`OAuth server listening on port ${OAUTH_PORT}`);
        resolve();
      });
    });
  }

  async startAuth() {
    try {
      await this.startServer();
    } catch (e) {
      if (e.code === 'EADDRINUSE') {
        throw new Error(`Port ${OAUTH_PORT} is in use by another app (likely OpenCode). Please close it to sign in.`);
      } else {
        throw e;
      }
    }

    if (this.pendingAuth) {
       this.pendingAuth.reject(new Error("Cancelled by new request"));
    }

    const pkce = this.generatePKCE();
    const state = this.generateState();
    const redirectUri = `http://localhost:${OAUTH_PORT}/auth/callback`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: "openid profile email offline_access",
      code_challenge: pkce.challenge,
      code_challenge_method: "S256",
      id_token_add_organizations: "true",
      codex_cli_simplified_flow: "true",
      state,
      originator: "opencode",
    });

    const url = `${ISSUER}/oauth/authorize?${params.toString()}`;

    return { url, state, pkce };
  }

  async waitForCallback(state, pkce) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingAuth) {
           this.pendingAuth = null;
           reject(new Error("OAuth Timeout"));
        }
      }, 5 * 60 * 1000); // 5 mins

      this.pendingAuth = {
        state,
        pkce,
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      };
    });
  }

  stopServer() {
    if (this.pendingAuth) {
       this.pendingAuth.reject(new Error("Server stopped"));
       this.pendingAuth = null;
    }
    if (this.server) {
      this.server.close();
      for (const socket of this.sockets) {
        socket.destroy();
      }
      this.sockets.clear();
      this.server = null;
    }
  }
}

module.exports = new OAuthManager();
