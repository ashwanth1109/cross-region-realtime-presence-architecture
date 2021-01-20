type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {};
};

export async function handler(e: AppSyncEvent) {
  console.log(e);

  return null;
}
