import express from "express";
import { router as index } from "./api/index";
import { router as cat_user } from "./api/cat_user";
import { router as cat_picture } from "./api/cat_picture";
import { router as cat_record } from "./api/cat_record";
import cors from "cors";
import bodyParser from "body-parser";

export const app = express();

// app.use("/", (req, res) => {
//     res.send("Hello World");
// });

app.use(
  cors({
    origin: "*",
  })
);
app.use(bodyParser.text());
app.use(bodyParser.json());
app.use("/", index);
app.use("/user", cat_user);
app.use("/picture", cat_picture);
app.use("/record", cat_record);
