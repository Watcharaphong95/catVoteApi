import express from "express"
import { router as index } from "./api/index";
import { router as cat_user } from "./api/cat_user";

export const app = express();

// app.use("/", (req, res) => {
//     res.send("Hello World");
// });

app.use("/", index);
app.use("/user", cat_user);