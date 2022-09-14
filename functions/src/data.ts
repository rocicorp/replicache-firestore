import { Firestore, Transaction } from "firebase-admin/firestore";

export function createSpace(db: Firestore, tx: Transaction, spaceID: string) {
  console.log("creating space", spaceID);
  tx.create(db.collection("spaces").doc(spaceID), {
    id: spaceID,
    version: 0,
  });
}

export function setVersion(
  db: Firestore,
  tx: Transaction,
  spaceID: string,
  version: number
) {
  tx.update(db.collection("spaces").doc(spaceID), { version });
}

export async function getVersion(
  db: Firestore,
  tx: Transaction,
  spaceID: string
): Promise<number | undefined> {
  const space = await tx.get(db.collection("spaces").doc(spaceID));
  return space.data()?.version ?? undefined;
}

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
