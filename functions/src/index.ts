import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getTodos, putTodo } from "./data";

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

export const pull = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore();
  const todos = await db.runTransaction(
    async (tx) => {
      const todos = await getTodos(db, tx, "s1", 1);
      return todos;
    },
    {
      readOnly: true,
    }
  );
  res.json(todos.docs.map((d) => d.data()));
});
