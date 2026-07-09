export const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

export const getEnvOptional = (key: string): string | undefined => {
  return process.env[key] || undefined;
};
