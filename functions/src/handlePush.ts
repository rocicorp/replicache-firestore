import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getVersion, setVersion } from "./space";
import { getLastMutationID, setLastMutationID } from "./client";
import { Firestore, Transaction } from "firebase-admin/firestore";
import { Todo, TodoUpdate } from "./todo";
import * as cors from "cors";
import { createTodo, updateTodo, deleteTodo } from "./mutators";

// Implements the Replicache "push" endpoint.
// See: https://doc.replicache.dev/server-push and
// https://doc.replicache.dev/guide/remote-mutations
export const push = functions.https.onRequest((req, res) => {
  cors({ origin: true })(req, res, async () => {
    const db = admin.firestore();

    res.header("Content-Type", "application/json");

    const spaceID = req.query.spaceID as string;
    if (!spaceID) {
      res.status(400).send("spaceID query param required");
      return;
    }

    // TODO: validate
    const pushRequest = req.body; // as PushRequest;

    const errorMessage = await db.runTransaction(async (tx) => {
      // Get the previous version for this space and calculate the next one.
      // We need to mark all the changed entries in the space with this next
      // version so that pull can find them when looking for changes.
      const prevVersion = await getVersion(db, tx, spaceID);
      if (prevVersion === undefined) {
        return "space does not exist";
      }

      const nextVersion = prevVersion + 1;

      // Get the previous lastMutationID. We need this to filter out mutations
      // that have already been processed (IOW, to make mutations idempotent).
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

      // Important: version and lastMutationID must be updated transactionally with
      // mutations.
      setVersion(db, tx, spaceID, nextVersion);
      setLastMutationID(db, tx, pushRequest.clientID, lastMutationID);
      return undefined;
    });

    // TODO: Send pokes to all clients connected to spaceID.
    // See: https://doc.replicache.dev/guide/poke
    // On Firestore, I assume this would be FCM?

    if (errorMessage !== undefined) {
      res.status(400).send(errorMessage);
      return;
    }

    res.json({});
  });
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
