export async function handler(event: any) {
  event.Records.forEach((record: any) => {
    console.log("Stream record: ", JSON.stringify(record, null, 2));
  });
}
