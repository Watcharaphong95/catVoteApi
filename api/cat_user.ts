import express from "express";
import { conn, queryAsync } from "../dbconnect";
import mysql from "mysql";
import { UserPostResponse } from "../model/userPostResponse";
import multer from "multer";

export const router = express.Router();

// FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyDtn6Oh1qWj5QmPecCd4HXV4xjFb-fjeaA",
  authDomain: "catvoteproject.firebaseapp.com",
  projectId: "catvoteproject",
  storageBucket: "catvoteproject.appspot.com",
  messagingSenderId: "786302845472",
  appId: "1:786302845472:web:b07457686142683e6c3245",
  measurementId: "G-TD6L9FVRX0",
};
import { initializeApp } from "firebase/app";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

initializeApp(firebaseConfig);
const storage = getStorage();

class FileMiddleware {
  filename = "";
  public readonly diskLoader = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 67108864, // 64 MByte
    },
  });
}

const fileUpload = new FileMiddleware();
// POST avatar and replace and delete in firebase
router.post(
  "/avatar/upload/:email",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res
        .status(500)
        .json({ response: false, status: "No file Uploaded" });
    }
    try {
      const filename = Math.round(Math.random() * 10000) + ".png";
      const storageRef = ref(storage, "/images/" + filename);
      const metaData = { contentType: req.file!.mimetype };
      const snapshot = await uploadBytesResumable(
        storageRef,
        req.file!.buffer,
        metaData
      );
      const url = await getDownloadURL(snapshot.ref);

      ////////////////////////
      const email = req.params.email;
      const userDetail: Partial<UserPostResponse> = {
        avatar: url,
      };
      let sql = "select * from cat_user where email = ?";
      sql = mysql.format(sql, [email]);
      const result = await queryAsync(sql);
      const jsonStr = JSON.stringify(result);
      const jsonObj = JSON.parse(jsonStr);
      const userDetailOriginal: UserPostResponse = jsonObj[0];
      if (userDetailOriginal.avatar != null) {
        // res.json(updateUser.avatar);
        const fileUrl = userDetailOriginal.avatar;
        const fileRef = ref(storage, fileUrl);

        deleteObject(fileRef);
      }

      const updateUser = { ...userDetailOriginal, ...userDetail };
      // res.json(updateUser.avatar);

      sql =
        "update `cat_user` set `username`=?, `email`=?, `password`=?, `avatar`=? where `email` = ?";
      // res.json(updateUser);
      sql = mysql.format(sql, [
        updateUser.username,
        updateUser.email,
        updateUser.password,
        updateUser.avatar || null,
        email,
      ]);

      conn.query(sql, (err, result) => {
        if (err) throw err;
      });
      ////////////////////////////////////////////
      res.status(200).json({
        filename: url,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ response: false, status: "Failed to upload" });
    }
  }
);

// Get user * if not have ?email=xxx get all user
// if have ?email=xxxx will get only 1 that match email
router.get("/", (req, res) => {
  const email = req.query.email;
  if (email) {
    let sql = "select * from cat_user where email = ?";
    sql = mysql.format(sql, [email]);
    conn.query(sql, (err, result) => {
      if (err) throw err;
      if (result != "") {
        res.status(200).json({ result, response: true });
      } else {
        res.status(400).json({ response: false });
      }
    });
  } else {
    const sql = "select * from cat_user";
    conn.query(sql, (err, result) => {
      if (err) throw err;
      if (result != "") {
        res.status(200).json({ result, response: true });
      } else {
        res.status(400).json({ response: false });
      }
    });
  }
});

// Get login
router.get("/login/:email/:password", async (req, res) => {
  const email = req.params.email;
  const password = req.params.password;
  let sql = "select * from cat_user where email = ?";
  sql = mysql.format(sql, [email]);
  const result = await queryAsync(sql);
  const jsonStr = JSON.stringify(result);
  const jsonObj = JSON.parse(jsonStr);
  if (result != "") {
    if (password == jsonObj[0].password!) {
      res.status(200).json({ response: true, status: "Login Success" });
    } else {
      res
        .status(200)
        .json({ response: false, status: "Wrong email or password" });
    }
  } else {
    res
      .status(200)
      .json({ response: false, status: "Wrong email or password" });
  }
});

// Get user by id
router.get("/:id", (req, res) => {
  const id = req.params.id;
  let sql = "select * from cat_user where uid = ?";
  sql = mysql.format(sql, [id]);
  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result != "") {
      res.status(200).json({ result, response: true });
    } else {
      res.status(400).json({ response: false });
    }
  });
});

// Post register
router.post("/", (req, res) => {
  let userDetail: UserPostResponse = req.body;
  if (
    userDetail.username != null &&
    userDetail.email != null &&
    userDetail.password != null
  ) {
    let sql =
      "INSERT INTO `cat_user`(`username`, `email`, `password`) VALUES (?,?,?)";
    sql = mysql.format(sql, [
      userDetail.username,
      userDetail.email,
      userDetail.password,
    ]);

    let sqlCheck = "SELECT * FROM cat_user WHERE email = ?";
    sqlCheck = mysql.format(sqlCheck, [userDetail.email]);

    conn.query(sqlCheck, (err, result) => {
      if (err) throw err;
      if (result != "") {
        res
          .status(200)
          .json({ response: false, status: "Email already been used" });
      } else {
        conn.query(sql, (err, result) => {
          if (err) throw err;
          res.status(201).json({
            response: true,
            affected_row: result.affectedRows,
            last_idx: result.insertId,
          });
        });
      }
    });
  } else {
    res.status(500).json({ response: true, status: "Fill not complete" });
  }
});

// UPDATE // PUT edit profile
router.put("/:email", async (req, res) => {
  const email = req.params.email;
  const userDetail: UserPostResponse = req.body;

  let sql = "select * from cat_user where email = ?";
  sql = mysql.format(sql, [email]);
  const result = await queryAsync(sql);
  const jsonStr = JSON.stringify(result);
  const jsonObj = JSON.parse(jsonStr);
  const userDetailOriginal: UserPostResponse = jsonObj[0];

  const updateUser = { ...userDetailOriginal, ...userDetail };

  sql =
    "update `cat_user` set `username`=?, `email`=?, `password`=?, `avatar`=? where `email` = ?";
  sql = mysql.format(sql, [
    updateUser.username,
    updateUser.email,
    updateUser.password,
    updateUser.avatar || null,
    email,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({
      affected_row: result.affectedRows,
    });
  });
});
