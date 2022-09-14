import { Firestore, Transaction } from "firebase-admin/firestore";

export function setLastMutationID(
  db: Firestore,
  tx: Transaction,
  clientID: string,
  lastMutationID: number
) {
  tx.set(db.collection("clients").doc(clientID), {
    id: clientID,
    lastMutationID: lastMutationID,
  });
}
export async function getLastMutationID(
  db: Firestore,
  tx: Transaction,
  clientID: string
): Promise<number | undefined> {
  const client = await tx.get(db.collection("clients").doc(clientID));
  return client.data()?.lastMutationID ?? undefined;
}
