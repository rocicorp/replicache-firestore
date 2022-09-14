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
