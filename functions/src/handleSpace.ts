import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createSpace as createSpaceImpl } from "./space";

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
