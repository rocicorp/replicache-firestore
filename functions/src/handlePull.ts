import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getVersion } from "./space";
import { getLastMutationID } from "./client";
import { TodoEntry } from "./todo";

const db = admin.firestore();

// Implements the Replicache "pull" endpoint.
// See: https://doc.replicache.dev/server-pull and
// https://doc.replicache.dev/guide/dynamic-pull
export const pull = functions.https.onRequest(async (req, res) => {
  res.header("Content-Type", "application/json");

  const spaceID = req.query.spaceID as string;
  if (!spaceID) {
    res.status(400).send("spaceID query param required");
    return;
  }

  const {
    clientID,
    cookie: reqCookie,
    lastMutationID: reqLastMutationID,
  } = req.body;

  const txRes = await db.runTransaction(
    async (tx) => {
      // Super mega important: all three values (lmid, cookie, patch) must be
      // read as part of the same snapshot.

      // Read the LMID for the requesting client. This tells the client which
      // of its pending mutations should be discarded.
      const lastMutationID = await getLastMutationID(db, tx, clientID);
      if (lastMutationID === undefined && reqLastMutationID > 0) {
        return { error: "Unknown client" };
      }

      // Read the current version for the space requested. We set this as the
      // Replicache "cookie". Next pull, Replicache will send this back. This
      // allows us to return only changed keys.
      const cookie = await getVersion(db, tx, spaceID);
      if (cookie === undefined) {
        return { error: "Unknown space" };
      }

      // Read all entries changed since the supplied cookie.
      const query = db
        .collection("todos")
        .where("spaceID", "==", spaceID)
        .where("version", ">", reqCookie ?? 0);
      const todos = await tx.get(query);
      return {
        cookie,
        lastMutationID,
        todos,
      };
    },
    {
      readOnly: true,
    }
  );

  if ("error" in txRes) {
    res.status(400).send(txRes.error);
    return;
  }

  const patch = [];
  const { todos, cookie, lastMutationID } = txRes;
  
  // Build our patch
  for (const doc of todos.docs) {
    const entry = doc.data() as TodoEntry;
    const key = `todos/${entry.todo.id}`;
    if (entry.deleted) {
      patch.push({ op: "del", key });
    } else {
      patch.push({ op: "put", key, value: entry.todo });
    }
  }

  const result = {
    cookie,
    lastMutationID,
    patch,
  };

  res.json(result);
});
