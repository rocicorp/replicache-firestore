import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  getLastMutationID,
  getVersion,
  setLastMutationID,
  createSpace as createSpaceImpl,
  setVersion,
} from "./data";
import { Firestore, Transaction } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

export const createSpace = functions.https.onRequest(async (req, res) => {
  res.header("Content-Type", "application/json");

  const spaceID = req.body.spaceID;
  if (typeof spaceID !== "string" || spaceID === "") {
    res.status(400).send("invalid spaceID");
  }

  db.runTransaction(async (tx) => {
    createSpaceImpl(db, tx, spaceID);
  });

  res.json({});
});

export const push = functions.https.onRequest(async (req, res) => {
  res.header("Content-Type", "application/json");

  const spaceID = req.query.spaceID as string;
  if (!spaceID) {
    res.status(400).send("spaceID query param required");
    return;
  }

  // TODO: validate
  const pushRequest = req.body; // as PushRequest;

  const errorMessage = await db.runTransaction(async (tx) => {
    const prevVersion = await getVersion(db, tx, spaceID);
    if (prevVersion === undefined) {
      return "space does not exist";
    }

    const nextVersion = prevVersion + 1;

    let lastMutationID =
      (await getLastMutationID(db, tx, pushRequest.clientID)) ?? 0;

    for (const mutation of pushRequest.mutations) {
      const expectedMutationID = lastMutationID + 1;

      if (mutation.id < expectedMutationID) {
        console.log(`skipping already processed mutation: ${mutation.id}`);
        continue;
      }

      if (mutation.id > expectedMutationID) {
        return `mutation out of order: got ${mutation.id} expected ${expectedMutationID}`;
      }

      try {
        processMutation(
          db,
          tx,
          mutation.name,
          mutation.args,
          spaceID,
          nextVersion
        );
      } catch (e) {
        // TODO: You probably want to do something more sophisticated here to retain
        // the original content and tell the user.
        console.error(`mutation ${mutation} failed, skipping: ${e}`);
      }
      lastMutationID = expectedMutationID;
    }

    setVersion(db, tx, spaceID, nextVersion);
    setLastMutationID(db, tx, pushRequest.clientID, lastMutationID);
    return undefined;
  });

  if (errorMessage !== undefined) {
    res.status(400).send(errorMessage);
    return;
  }

  res.json({});
});

function processMutation(
  db: Firestore,
  tx: Transaction,
  name: string,
  arg: any,
  spaceID: string,
  version: number
) {
  switch (name) {
    case "createTodo":
      createTodo(db, tx, arg as Todo, spaceID, version); // TODO: validate arg
      break;
    case "updateTodo":
      updateTodo(db, tx, arg as TodoUpdate, version);
      break;
    case "deleteTodo":
      deleteTodo(db, tx, arg as string, version);
      break;
    default:
      throw new Error(`unknown mutation: ${name}`);
  }
}

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  sort: number;
};

type TodoUpdate = Pick<Todo, "id"> & Partial<Todo>;

type TodoEntry = {
  todo: Todo;
  spaceID: string;
  deleted: boolean;
  version: number;
};

function createTodo(
  db: Firestore,
  tx: Transaction,
  todo: Todo,
  spaceID: string,
  version: number
) {
  const entry: TodoEntry = {
    todo,
    spaceID,
    deleted: false,
    version,
  };
  tx.create(db.collection("todos").doc(todo.id), entry);
}

function updateTodo(
  db: Firestore,
  tx: Transaction,
  todo: TodoUpdate,
  version: number
) {
  const entry = {
    todo,
    version,
  };
  tx.set(db.collection("todos").doc(todo.id), entry, { merge: true });
}

function deleteTodo(
  db: Firestore,
  tx: Transaction,
  id: string,
  version: number
) {
  const entry = {
    version,
    deleted: true,
  };
  tx.set(db.collection("todos").doc(id), entry, { merge: true });
}

/*
export const pull = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore();
  res.header("Content-Type", "text/plain");
  const [t1, t2] = await db.runTransaction(
    async (tx) => {
      const todos = await getTodos(db, tx, "s1", 1);
      const id = nanoid();
      await db
        .collection("todos")
        .doc(id)
        .set({
          id,
          spaceID: "s1",
          version: 2,
          deleted: false,
          text: `hello-${Date.now()}`,
          complete: false,
        });
      // just to be sure.
      await sleep(1000);
      const todos2 = await getTodos(db, tx, "s1", 1);
      return [todos, todos2];
    },
    {
      readOnly: true,
    }
  );
  function stringify(snap: QuerySnapshot) {
    return JSON.stringify(snap.docs.map((d) => d.data()));
  }
  res.send(`t1: ${stringify(t1)}\n\nt2: ${stringify(t2)}`);
});
*/
