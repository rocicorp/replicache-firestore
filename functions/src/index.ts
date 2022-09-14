import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getTodos, putTodo } from "./data";
import { QuerySnapshot } from "firebase-admin/firestore";

admin.initializeApp();

// Start writing Firebase Functions
// https://firebase.google.com/docs/functions/typescript

function nanoid() {
  return Math.random().toString(36).substring(2);
}

export const push = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore();
  await db.runTransaction(async (tx) => {
    for (let i = 0; i < 500; i++) {
      putTodo(db, tx, {
        id: nanoid(),
        spaceID: "s1",
        version: 2,
        deleted: false,
        text: "hello",
        complete: false,
      });
    }
  });
  res.json("ok");
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
