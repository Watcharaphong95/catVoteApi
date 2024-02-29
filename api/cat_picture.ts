import express from "express";
import { conn, queryAsync } from "../dbconnect";
import mysql from "mysql";
import multer from "multer";

export const router = express.Router();

// Get picture all
router.get("/", (req, res) => {
  const sql = "select * from cat_picture";

  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result != "") {
        res.status(200).json({ result, response: true });
      } else {
        res.status(400).json({ response: false });
      }
  });
});

// Get picture where uid = xxxx
router.get("/:uid", (req, res) => {
  const uid = req.params.uid;

  let sql = "select * from cat_picture where p_uid = ?";
  sql = mysql.format(sql, [uid]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result != "") {
        res.status(200).json({ result, response: true });
      } else {
        res.status(400).json({ response: false });
      }
  });
});

// FIREBASE FOR UPLOAD PICTURE
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
router.post(
  "/upload/:email",
  fileUpload.diskLoader.single("file"),
  async (req, res) => {
    const email = req.params.email;
    // select for img limit
    let sqlCheck = "SELECT COUNT(*) as count FROM cat_picture WHERE p_uid IN (SELECT uid FROM cat_user WHERE email = ?)";
    sqlCheck = mysql.format(sqlCheck, [email]);
    const resultCount = await queryAsync(sqlCheck);
    const countStr = JSON.stringify(resultCount);
    const countObj = JSON.parse(countStr);
    // res.json(countObj[0].count);

    if (countObj[0].count < 5) {
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

        let sql = "INSERT INTO `cat_picture` (`p_uid`, `picture`) VALUES ((SELECT uid FROM cat_user WHERE email = ?),?)";
        sql = mysql.format(sql, [email, url]);

        conn.query(sql, (err, result) => {
          if (err) throw err;
        });
        ////////////////////////////////////////////////
        res.status(201).json({
            response: true,
            statis: 'Upload complete',
            filename: url,
        });
      } catch (error) {
        console.log(error);
        res.status(500).json({ response: false, status: "Failed to upload" });
      }
    } else {
      res.status(500).json({ response: false, status: "Limit Upload is 5" });
    }
  }
);
