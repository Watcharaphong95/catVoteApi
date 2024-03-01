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
      res.status(500).json({ response: false });
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
      res.status(500).json({ response: false });
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
  deleteObject,
} from "firebase/storage";
import {
  PictureGetResponse,
  PicturePostResponse,
} from "../model/picturePostResponse";

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
    if (!req.file) {
      return res
        .status(500)
        .json({ response: false, status: "No file Uploaded" });
    }
    const email = req.params.email;
    // select for img limit
    let sqlCheck =
      "SELECT COUNT(*) as count FROM cat_picture WHERE p_uid IN (SELECT uid FROM cat_user WHERE email = ?)";
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

        let sql =
          "INSERT INTO `cat_picture` (`p_uid`, `picture`) VALUES ((SELECT uid FROM cat_user WHERE email = ?),?)";
        sql = mysql.format(sql, [email, url]);

        conn.query(sql, (err, result) => {
          if (err) throw err;
        });
        ////////////////////////////////////////////////
        res.status(201).json({
          response: true,
          statis: "Upload complete",
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

// delete in cat_pic where pid
router.delete("/delete/:pid", async (req, res) => {
  const pid = req.params.pid;
  let sql = "SELECT picture FROM cat_picture WHERE pid = ?";
  sql = mysql.format(sql, [pid]);
  const result = await queryAsync(sql);
  const jsonStr = JSON.stringify(result);
  const jsonObj = JSON.parse(jsonStr);
  if (result != "") {
    const fileUrl = jsonObj[0].picture;
    const fileRef = ref(storage, fileUrl);

    let sql = "DELETE FROM cat_picture WHERE pid = ?";
    sql = mysql.format(sql, [pid]);
    conn.query(sql, (err, result) => {
      if (err) throw err;
    });

    deleteObject(fileRef)
      .then(() => {
        res
          .status(200)
          .json({ response: true, status: "File has been deleted" });
      })
      .catch((error) => {
        res
          .status(500)
          .json({ response: false, status: "Fail to delete file" });
      });
  } else {
    res.status(500).json({ response: false, status: "No picture found" });
  }
});

// change pic (delete file in firebase then upload new one and change in
// database and delete all record in cat_pic_record where r_pid = change pic(pid))
router.post(
  "/change/:pid",
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
      const pid = req.params.pid;
      const picDetail: Partial<PicturePostResponse> = {
        picture: url,
      };
      let sql = "select * from cat_picture where pid = ?";
      sql = mysql.format(sql, [pid]);
      const result = await queryAsync(sql);
      const jsonStr = JSON.stringify(result);
      const jsonObj = JSON.parse(jsonStr);
      const picDetailOriginal: PicturePostResponse = jsonObj[0];
      if (picDetailOriginal.picture != null) {
        // res.json(updateUser.avatar);
        const fileUrl = picDetailOriginal.picture;
        const fileRef = ref(storage, fileUrl);

        deleteObject(fileRef);
      }

      const updatePic = { ...picDetailOriginal, ...picDetail };
      // res.json(updateUser.avatar);

      sql = "update `cat_picture` set `p_uid`=?, `picture`=?";
      // res.json(updateUser);
      sql = mysql.format(sql, [updatePic.p_uid, updatePic.picture]);

      conn.query(sql, (err, result) => {
        if (err) throw err;
      });

      sql = "DELETE FROM cat_pic_record WHERE r_pid = ?";
      sql = mysql.format(sql, [updatePic.p_uid]);
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

// Get random pid for main page to vote
router.get("/random/forvote", async (req, res) => {
  // let sql = 'select * FROM cat_picture ORDER BY RAND() LIMIT 2';
  let sql = "SELECT * FROM cat_picture ORDER BY RAND() LIMIT 1";
  const pic1 = await queryAsync(sql);
  const picStr1 = JSON.stringify(pic1);
  const picObj1 = JSON.parse(picStr1);
  const picVote1: PictureGetResponse = picObj1[0];
  // res.json(picVote1);

  sql =
    "SELECT * FROM (SELECT * FROM cat_picture WHERE pid != ? ORDER BY ABS(score - ?) LIMIT 3) AS subquery ORDER BY RAND() LIMIT 1";
  sql = mysql.format(sql, [picVote1.pid, picVote1.score]);
  const pic2 = await queryAsync(sql);
  const picStr2 = JSON.stringify(pic2);
  const picObj2 = JSON.parse(picStr2);
  let picVote2: PictureGetResponse = picObj2[0];
  const test = { picVote1, picVote2 };
  res.json(test);
});
