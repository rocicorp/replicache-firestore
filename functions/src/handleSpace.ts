import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createSpace as createSpaceImpl } from "./space";

// Implements the "createSpace" endpoint needed by the todo app.
// Spaces are not part of the Replicache protocol officially, but
// they are a common pattern. Typically data is partitioned into
// "spaces" < ~100MB each. Replicache's sync guarantees only hold
// over a single space. Mutations to a space are typically
// serialized server-side on a single version counter (as in this
// example).
//
// You do not need the space entity or this endpoint specifically
// but you need some entity in your system to play the role of a
// space, and host the version number this space entity stores.
export const createSpace = functions.https.onRequest(async (req, res) => {
  const db = admin.firestore();

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
