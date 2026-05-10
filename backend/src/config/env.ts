import "dotenv/config";

const requiredEnv = ["DATABASE_URL", "JWT_SECRET"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Variable d'environnement manquante: ${key}`);
  }
}

export const env = {
  databaseUrl: process.env.DATABASE_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  port: Number(process.env.PORT ?? 4000)
};
