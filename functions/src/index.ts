import * as admin from "firebase-admin";

admin.initializeApp();

export { createSpace } from "./handleSpace";
export { push } from "./handlePush";
export { pull } from "./handlePull";
