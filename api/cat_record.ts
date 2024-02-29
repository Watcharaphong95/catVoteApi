import express from "express";
import { conn } from "../dbconnect";
import mysql from "mysql";

export const router = express.Router();

// Get all record
router.get("/", (req, res) => {
  const sql = "select * from cat_pic_record";

  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result != "") {
      res.status(200).json({ result, response: true });
    } else {
      res.status(400).json({ response: false });
    }
  });
});

// Get record where pid and order by date all time
router.get("/all/:pid", (req, res) => {
  const pid = req.params.pid;
  // add rid to select for check if want to
  let sql =
    'SELECT r_pid, score, DATE_FORMAT(date, "%d-%m-%y") as date FROM cat_pic_record WHERE (r_pid, date) IN (SELECT r_pid, MAX(date) AS max_date FROM cat_pic_record WHERE r_pid = ? GROUP BY r_pid, DATE(date));';
  sql = mysql.format(sql, [pid]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result != "") {
      res.status(200).json({ result, response: true });
    } else {
      res.status(400).json({ response: false });
    }
  });
});

// Get record this day
router.get("/curday/:pid", (req, res) => {
  const pid = req.params.pid;
  let sql =
    'SELECT rid, r_pid, score, DATE_FORMAT(date, "%d-%m-%y") as date FROM cat_pic_record WHERE (r_pid, date) IN (SELECT r_pid, MAX(date) AS max_date FROM cat_pic_record WHERE r_pid = ? GROUP BY r_pid);';
  sql = mysql.format(sql, [pid]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result != "") {
      res.status(200).json({ result, response: true });
    } else {
      res.status(400).json({ response: false });
    }
  });
});

// Get record yesterday
router.get("/yesterday/:pid", (req, res) => {
  const pid = req.params.pid;
  let sql =
    'SELECT rid, r_pid, score, DATE_FORMAT(date, "%d-%m-%y") as date FROM cat_pic_record WHERE (r_pid, date) IN (SELECT r_pid, MAX(date) AS max_date FROM cat_pic_record WHERE r_pid = ? GROUP BY r_pid, DATE(date)) AND DATE(date) = CURDATE() - INTERVAL 1 DAY;';
  sql = mysql.format(sql, [pid]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result != "") {
      res.status(200).json({ result, response: true });
    } else {
      res.status(400).json({ response: false });
    }
  });
});
