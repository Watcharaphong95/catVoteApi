import express from "express";
import { conn, queryAsync } from "../dbconnect";
import mysql from "mysql";
import {
  PictureGetResponse,
  PicturePostResponse,
} from "../model/picturePostResponse";

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

// POST record when it has been vote(calculate elo rating in here)
router.post("/vote", async (req, res) => {
  const pid1 = req.query.pid1;
  const pid2 = req.query.pid2;
  const selectPic: any = req.query.selectPid;
  if (!pid1 || !pid2 || !selectPic) {
    return res
      .status(500)
      .json({ response: false, status: "Parameter not match" });
  }
  //   let str =
  //     pid1?.toString() + " " + pid2?.toString() + " " + selectPid?.toString();

  //   if (pid1 == selectPid) {
  //     res.json("pid1");
  //   } else if (pid2 == selectPid) {
  //     res.json("pid2");
  //   }

  let sql = "SELECT * FROM cat_picture WHERE pid = ? OR pid = ?";
  sql = mysql.format(sql, [pid1, pid2]);
  const result = await queryAsync(sql);
  const jsonStr = JSON.stringify(result);
  const jsonObj = JSON.parse(jsonStr);
  const picDetailOriginal1: PictureGetResponse = jsonObj[0];
  const picDetailOriginal2: PictureGetResponse = jsonObj[1];
  // let str = picDetailOriginal1.pid.toString() +"  "+ picDetailOriginal2.pid.toString();
  // res.json(selectPic);

  if (picDetailOriginal1.pid == selectPic) {
    let scoreResult =
      1 /
      (1 +
        Math.pow(
          10,
          (picDetailOriginal2.score - picDetailOriginal1.score) / 400
        ));
    picDetailOriginal1.score = Math.round(
      picDetailOriginal1.score + 30 * (1 - scoreResult)
    );
    picDetailOriginal2.score = Math.round(
      picDetailOriginal2.score + 30 * (0 - scoreResult)
    );
    // res.json("equal 1");
  } else if (picDetailOriginal2.pid == selectPic) {
    let scoreResult =
      1 /
      (1 +
        Math.pow(
          10,
          (picDetailOriginal2.score - picDetailOriginal1.score) / 400
        ));
    picDetailOriginal1.score = Math.round(
      picDetailOriginal1.score + 30 * (0 - scoreResult)
    );
    picDetailOriginal2.score = Math.round(
      picDetailOriginal2.score + 30 * (1 - scoreResult)
    );
    // res.json("equal 2");
  } else {
    return res
      .status(500)
      .json({ response: false, status: "parameter not match" });
  }
  // res.json(picDetailOriginal1);

  sql = "INSERT INTO `cat_pic_record` (`r_pid`, `score`) VALUES(?,?)";
  sql = mysql.format(sql, [picDetailOriginal1.pid, picDetailOriginal1.score]);
  const record1 = await queryAsync(sql);

  sql = "INSERT INTO `cat_pic_record` (`r_pid`, `score`) VALUES(?,?)";
  sql = mysql.format(sql, [picDetailOriginal2.pid, picDetailOriginal2.score]);
  const record2 = await queryAsync(sql);

//   PIC 1
  sql = "SELECT * FROM cat_picture WHERE pid = ?";
  sql = mysql.format(sql, [picDetailOriginal1.pid]);
  const tempPic1 = await queryAsync(sql);
  const tempStr1 = JSON.stringify(tempPic1);
  const tempObj1 = JSON.parse(tempStr1);
  const picDetailTemp1: PictureGetResponse = tempObj1[0];

  const updatePic1 = { ...picDetailTemp1, ... picDetailOriginal1}

  sql = "UPDATE `cat_picture` SET `picture`=?, `score`=? WHERE pid = ?";
  sql = mysql.format(sql, [
        updatePic1.picture,
        updatePic1.score,
        updatePic1.pid
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
  });

//   PIC 2

sql = "SELECT * FROM cat_picture WHERE pid = ?";
  sql = mysql.format(sql, [picDetailOriginal2.pid]);
  const tempPic2 = await queryAsync(sql);
  const tempStr2 = JSON.stringify(tempPic2);
  const tempObj2 = JSON.parse(tempStr2);
  const picDetailTemp2: PictureGetResponse = tempObj2[0];

  const updatePic2 = { ...picDetailTemp2, ... picDetailOriginal2}

  sql = "UPDATE `cat_picture` set `picture`=?, `score`=? WHERE pid = ?";
  sql = mysql.format(sql, [
        updatePic2.picture,
        updatePic2.score,
        updatePic2.pid
  ]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
  });

  res.status(201).json({ response: true, status: "score had been recorded" });
  //
});
