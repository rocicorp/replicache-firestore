import { Firestore, Transaction } from "firebase-admin/firestore";

// Helper functions for reading and writing data about "clients".
// Replicache keeps a tiny bit of server-side state for each client
// (~tab) that connects -- specifically what is the last mutation
// from that client which has been processed.

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
