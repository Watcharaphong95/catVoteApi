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
    res.status(200).json(result);
  });
});

// Get picture where uid = xxxx
router.get("/:uid", (req, res) => {
  const uid = req.params.uid;

  let sql = "select * from cat_picture where p_uid = ?";
  sql = mysql.format(sql, [uid]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json({ result });
  });
});

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
} from "firebase/storage";
import { PicturePostResponse } from "../model/picturePostResponse";
import { UserPostResponseForUID } from "../model/userPostResponse";

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
      
      let sql = "select * from cat_user where email = ?";
      sql = mysql.format(sql, [email]);
      const result = await queryAsync(sql);
      const jsonStr = JSON.stringify(result);
      const jsonObj = JSON.parse(jsonStr);
      const userDetailOriginal: UserPostResponseForUID = jsonObj[0];
      const userDetail: Partial<PicturePostResponse> ={
        p_uid: userDetailOriginal.uid,
        picture: url,
      };

      sql = "INSERT INTO `cat_picture` (`p_uid`, `picture`) VALUES (?,?)";
      sql = mysql.format(sql, [
        userDetail.p_uid,
        userDetail.picture
      ]);

      conn.query(sql, (err, result) => {
        if (err) throw err;
      });
      ////////////////////////////////////////////////
      res.status(200).json({
        filename: url,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ response: false, status: "Failed to upload" });
    }
  }
);
