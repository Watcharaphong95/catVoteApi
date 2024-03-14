import express from "express";
import { conn, queryAsync } from "../dbconnect";
import mysql from "mysql";
import { UserPostResponse } from "../model/userPostResponse";
import multer from "multer";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt, { hash } from "bcrypt";
export const router = express.Router();

//CONFIRM EMAIL//
router.post("/send-email", (req, res) => {
  let userDetail: UserPostResponse = req.body;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "65011212077@msu.ac.th",
      pass: "wwqu zlri pwld vdef",
    },
  });

  const token = jwt.sign(
    {
      userDetail: userDetail,
      data: "Token Data",
    },
    "ourSecretKey",
    { expiresIn: "10m" }
  );

  const mailConfigurations = {
    // It should be a string of sender/server email
    from: "65011212077@msu.ac.th",

    to: userDetail.email,

    // Subject of Email
    subject: "Email Verification",

    // This would be the text of email body
    text: `Hi! There, You have recently visited  
           our website and entered your email. 
           Please follow the given link to verify your email 
           https://catvoteproject.web.app/verify/${token}
           Thanks`,
  };

  transporter.sendMail(mailConfigurations, function (error, info) {
    if (error) throw error;
    res.status(200).json(info);
  });
});

router.get("/verify/:token", (req, res) => {
  const token = req.params.token;
  jwt.verify(token, "ourSecretKey", function (err, decoded) {
    if (err) {
      console.log(err);
      res.send(
        "Email verification failed, possibly the link is invalid or expired"
      );
    } else {
      const userDetail = (decoded as { userDetail: UserPostResponse })
        .userDetail;
      const saltRounds = 10;
      bcrypt.hash(userDetail.password, saltRounds, function (err, hash) {
        if (err) throw err;
        userDetail.password = hash;
        // console.log(userDetail.password);
        res.send({ result: true, userDetail });
      });
      // console.log(userDetail);
    }
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
  deleteObject,
} from "firebase/storage";
import { DelayPostResponse } from "../model/recordDelayGetResponse";

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
router.put(
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

      // res.json(updateUser.avatar);

      sql =
        "update `cat_user` set `username`=?, `email`=?, `password`=?, `avatar`=? where `email` = ?";
      // res.json(updateUser);
      sql = mysql.format(sql, [
        userDetailOriginal.username,
        userDetailOriginal.email,
        userDetailOriginal.password,
        url,
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
        res.status(200).json({ response: false });
      }
    });
  } else {
    const sql = "select * from cat_user where type != 'admin'";
    conn.query(sql, (err, result) => {
      if (err) throw err;
      if (result != "") {
        res.status(200).json({ result, response: true });
      } else {
        res.status(200).json({ response: false });
      }
    });
  }
});

// Get Admin Delay Time
router.get("/delay", (req, res) => {
  let sql = "select avatar from cat_user where type = ?";
  sql = mysql.format(sql, ["admin"]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json(result);
  });
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
    bcrypt.compare(password, jsonObj[0].password, function (err, result) {
      if (result) {
        res.status(200).json({ response: true, status: "Login Success" });
      } else {
        res
          .status(200)
          .json({ response: false, status: "Wrong email or password" });
      }
    });
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
      res.status(200).json({ response: false });
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
    res.status(200).json({ response: true, status: "Fill not complete" });
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
  let hashPassword: any;
  bcrypt.hash(updateUser.password, 10, function(err, hash){
     hashPassword = hash
  }),
 

  sql =
    "update `cat_user` set `username`=?, `email`=?, `password`=?, `avatar`=? where `email` = ?";
  sql = mysql.format(sql, [
    updateUser.username,
    updateUser.email,
    hashPassword,
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

////////////////////////////////// ADMIN ZONE //////////////////////////////////////////////
// PUT record that has been vote fot x second(x is value then send by admin to limit vote)
router.put("/timedelay/set", async (req, res) => {
  const delay: DelayPostResponse = req.body;
  // res.json(delay.delay);
  let sql = "select * from cat_user where type = 'admin'";

  const tempAdminData = await queryAsync(sql);
  const jsonTemp = JSON.stringify(tempAdminData);
  const jsonObj = JSON.parse(jsonTemp);
  const adminData: UserPostResponse = jsonObj[0];

  sql =
    "update `cat_user` set `username`=?, `email`=?, `password`=?, `avatar`=? where `type`=?";
  sql = mysql.format(sql, [
    adminData.username,
    adminData.email,
    adminData.password,
    delay.delay,
    "admin",
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(200).json({ affected_row: result.affectedRows, response: true });
  });
});
