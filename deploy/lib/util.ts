export const PROJECT_NAME = "openh";
export const ENV_NAME = "ash";

export const withEnv = (name: string) => `${PROJECT_NAME}-${name}-${ENV_NAME}`;

export const constructIntegUri = (fnArn: string, region: string) => {
  const arnPrefix = `arn:aws:apigateway:${region}`;
  const lambdaPathPrefix = `lambda:path/2015-03-31/functions/`;
  const invocation = `${lambdaPathPrefix}${fnArn}/invocations`;
  return `${arnPrefix}:${invocation}`;
};
