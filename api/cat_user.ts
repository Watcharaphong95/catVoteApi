import express from "express";
import { conn, queryAsync } from "../dbconnect";
import mysql from "mysql";
import { UserPostResponse } from "../model/userPostResponse";

export const router = express.Router();

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
});

// UPDATE // PUT edit profile
router.put("/:uid", async (req, res) => {
  const uid = req.params.uid;
  const userDetail: UserPostResponse = req.body;

  let sql = "select * from cat_user where uid = ?";
  sql = mysql.format(sql, [uid]);
  const result = await queryAsync(sql);
  const jsonStr = JSON.stringify(result);
  const jsonObj = JSON.parse(jsonStr);
  const userDetailOriginal: UserPostResponse = jsonObj[0];

  const updateUser = { ...userDetailOriginal, ...userDetail };

  sql =
    "update `cat_user` set `username`=?, `email`=?, `password`=?, `avatar`=? where `uid` = ?";
  sql = mysql.format(sql, [
    updateUser.username,
    updateUser.email,
    updateUser.password,
    updateUser.avatar || null,
    uid,
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.status(201).json({
      affected_row: result.affectedRows,
    });
  });
});
