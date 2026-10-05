import "dotenv/config";

const port = Number(process.env.PORT ?? 4000);

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number.isInteger(port) && port > 0 ? port : 4000,
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  jwtSecret: required("JWT_SECRET"),
};
