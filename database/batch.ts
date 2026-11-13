import { database } from "@/database";
import { Model } from "@nozbe/watermelondb";

export async function runBatch(...records: Model[]): Promise<void> {
  await database.write(() => database.batch(...records));
}
