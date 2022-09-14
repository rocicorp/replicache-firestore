import { Firestore, Transaction } from "firebase-admin/firestore";
import { Todo, TodoEntry, TodoUpdate } from "./todo";

// This file implements server-side mutators for the Todo sample app.
// A corresponding set of client-side mutators must be implemented
// for optimistic mutations.
//
// It is frequently possible to share mutator code between client and
// server in a monorepo setup. See any of our samples for examples.
//
// However in the case where the server has its own separate data
// model, sharing the code is slightly more complex. So this sample
// demonstrates the simplest thing, which is having separate mutators
// on client and server.

export function createTodo(
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

export function updateTodo(
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

export function deleteTodo(
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
