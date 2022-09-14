import { Firestore, Transaction } from "firebase-admin/firestore";

export type ReplicacheEntry = {
  id: string;
  spaceID: string;
  deleted: boolean;
  version: number;
};

export async function getTodo(
  db: Firestore,
  tx: Transaction,
  id: string
): Promise<ReplicacheEntry | undefined> {
  const res = await tx.get(db.collection("todos").doc(id));
  if (!res.exists) {
    return undefined;
  }
  const entry = res.data() as ReplicacheEntry;
  if (!entry.deleted) {
    return undefined;
  }
  return entry;
}

export async function putTodo<T extends ReplicacheEntry>(
  db: Firestore,
  tx: Transaction,
  todo: T
) {
  tx.set(db.collection("todos").doc(todo.id), todo, {
    merge: false,
  });
}

export async function getTodos(
  db: Firestore,
  tx: Transaction,
  spaceID: string,
  newerThan?: number
) {
  let query = db.collection("todos").where("spaceID", "==", spaceID);
  if (newerThan !== undefined) {
    query = query.where("version", ">", newerThan);
  }
  return await tx.get(query);
}

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
