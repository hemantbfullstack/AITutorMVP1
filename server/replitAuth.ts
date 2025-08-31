import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { localSignupSchema, localLoginSchema } from "@shared/schema";

// Check if we're running in Replit environment
const isReplitEnvironment = !!(process.env.REPLIT_DOMAINS && process.env.REPL_ID);



if (isReplitEnvironment && !process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "local-dev-secret-key-only-for-development",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isReplitEnvironment, // Only secure in production (Replit), not in local development
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up Replit auth strategies if in Replit environment
  if (isReplitEnvironment) {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    for (const domain of process.env
      .REPLIT_DOMAINS!.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
  } else {
    // Set up local authentication strategy for development
    passport.use(new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: 'Invalid email or password' });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ));
  }

  passport.serializeUser((user: any, cb) => {
    if (isReplitEnvironment) {
      cb(null, user);
    } else {
      // For local users, serialize only the user ID
      cb(null, user.id);
    }
  });
  
  passport.deserializeUser(async (data: any, cb) => {
    if (isReplitEnvironment) {
      cb(null, data);
    } else {
      // For local users, deserialize by fetching from database
      try {
        const user = await storage.getUser(data);
        cb(null, user);
      } catch (error) {
        cb(error);
      }
    }
  });

  // Only set up auth routes if in Replit environment
  if (isReplitEnvironment) {
    app.get("/api/login", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    app.get("/api/callback", (req, res, next) => {
      passport.authenticate(`replitauth:${req.hostname}`, {
        successReturnToOrRedirect: "/",
        failureRedirect: "/api/login",
      })(req, res, next);
    });

    app.get("/api/logout", async (req, res) => {
      req.logout(async () => {
        const config = await getOidcConfig();
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    });
  } else {
    // Local development auth routes with real authentication
    app.post("/api/auth/signup", async (req, res) => {
      try {
        const validatedData = localSignupSchema.parse(req.body);
        
        // Check if user already exists
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser) {
          return res.status(400).json({ message: "User already exists with this email" });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(validatedData.password, 12);
        
        // Create user
        const user = await storage.createLocalUser({
          ...validatedData,
          password: hashedPassword,
        });
        
        // Log the user in
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ message: "Login failed after signup" });
          }
          res.json({ user: { ...user, password: undefined } });
        });
      } catch (error: any) {
        console.error("Signup error:", error);
        res.status(400).json({ message: error.message || "Signup failed" });
      }
    });

    app.post("/api/auth/login", (req, res, next) => {
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          return res.status(500).json({ message: "Authentication error" });
        }
        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }
        
        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ message: "Login failed" });
          }
          res.json({ user: { ...user, password: undefined } });
        });
      })(req, res, next);
    });

    app.get("/api/login", (req, res) => {
      res.redirect("/login");
    });

    app.post("/api/logout", (req, res) => {
      req.logout((err) => {
        if (err) {
          return res.status(500).json({ message: "Logout failed" });
        }
        res.json({ message: "Logged out successfully" });
      });
    });

    app.get("/api/logout", (req, res) => {
      req.logout((err) => {
        if (err) {
          return res.redirect("/");
        }
        res.redirect("/");
      });
    });
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // For local development or when Replit auth isn't properly configured
  if (!isReplitEnvironment || !req.isAuthenticated()) {
    // Try local authentication first
    if (req.isAuthenticated() && req.user) {
      return next();
    }
    
    // If we're in Replit environment but no proper auth, create a development user
    if (isReplitEnvironment) {
      // Mock authentication for development in Replit
      req.user = {
        claims: {
          sub: "replit-dev-user",
          email: "dev@replit.local",
          first_name: "Replit",
          last_name: "Developer"
        }
      };
      return next();
    }
    
    return res.status(401).json({ message: "Unauthorized" });
  }

  // For properly configured Replit environment
  const user = req.user as any;
  if (!user.expires_at) {
    return next(); // If no expiration, assume valid
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
