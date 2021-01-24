export const PROJECT_NAME = "openh";
export const ENV_NAME = "ash";

export const withEnv = (name: string) => `${PROJECT_NAME}-${name}-${ENV_NAME}`;
