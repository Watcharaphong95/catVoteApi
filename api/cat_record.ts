import express from "express";
import { conn, queryAsync } from "../dbconnect";
import mysql from "mysql";
import { PictureGetResponse } from "../model/picturePostResponse";
import { UserPostResponse } from "../model/userPostResponse";
import { VotePostResponse } from "../model/recordDelayGetResponse";

export const router = express.Router();

// Get all record
router.get("/", (req, res) => {
  const sql = "select * from cat_pic_record";

  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result != "") {
      res.status(200).json({ result, response: true });
    } else {
      res.status(200).json({ response: false });
    }
  });
});

// Get record where pid and order by date all time
router.get("/all/:pid", (req, res) => {
  const pid = req.params.pid;
  // add rid to select for check if want to
  let sql =
    'SELECT r_pid, score, LAG(score) OVER (PARTITION BY r_pid ORDER BY date) as oldScore, DATE_FORMAT(date, "%d-%m-%y") as date FROM cat_pic_record WHERE (r_pid, date) IN ( SELECT r_pid, MAX(date) AS max_date FROM cat_pic_record WHERE r_pid = ? GROUP BY r_pid, DATE(date) ) ORDER BY date DESC LIMIT 7';
  sql = mysql.format(sql, [pid]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result != "") {
      res.status(200).json({ result, response: true });
    } else {
      res.status(200).json({ response: false });
    }
  });
});

// Get record yesterday
router.get("/yesterday/:pid", (req, res) => {
  const pid = req.params.pid;
  let sql =
    "SELECT cat_picture.*, cat_pic_record.score as oldScore from cat_picture, cat_pic_record where cat_picture.pid = cat_pic_record.r_pid AND rid IN (SELECT rid FROM `cat_pic_record` WHERE DATE(date) < CURDATE() - INTERVAL 1 DAY AND r_pid = ?) ORDER BY rid DESC LIMIT 1";
  sql = mysql.format(sql, [pid]);

  conn.query(sql, (err, result) => {
    if (err) throw err;
    if (result != "") {
      res.status(200).json({ result, response: true });
    } else {
      res.status(200).json({ response: false });
    }
  });
});

// POST record when it has been vote(calculate elo rating in here)
router.post("/vote", async (req, res) => {
  const body: VotePostResponse = req.body;
  let pid1: any = "";
  let pid2: any = "";
  let selectPic: any = "";
  let uid: any = "";
  pid1 = body.pid1;
  pid2 = body.pid2;
  selectPic = body.selectPic;
  uid = body.uid;
  if (
    !pid1 ||
    !pid2 ||
    !selectPic ||
    !uid ||
    (selectPic != pid1 && selectPic != pid2)
  ) {
    return res
      .status(200)
      .json({ response: false, status: "Parameter not match" });
  }

  let sql = "select * from cat_user where type = 'admin'";
  const tempAdminData = await queryAsync(sql);
  const jsonAdminStr = JSON.stringify(tempAdminData);
  const jsonAdminObj = JSON.parse(jsonAdminStr);
  const adminData: UserPostResponse = jsonAdminObj[0];

  // SELECT lastest pid that has been vote
  sql =
    "SELECT r_pid FROM `cat_pic_record` WHERE `date` > (NOW() - INTERVAL ? SECOND) AND result = ? AND r_uid = ?";
  sql = mysql.format(sql, [adminData.avatar, 1, uid]);
  const tempDelayData = await queryAsync(sql);
  const jsonDelayStr = JSON.stringify(tempDelayData);
  const jsonDelayObj = JSON.parse(jsonDelayStr);
  const delayData = [];
  // console.log(jsonDelayObj);
  

  // push all pid in to delayData;
  for (let i = 0; i < jsonDelayObj.length; i++) {
    delayData.push(jsonDelayObj[i].r_pid);
  }

  // check if selectPic == lastest Pic?
  for (let i = 0; i < delayData.length; i++) {
    // res.json(delayData[0]);

    if (delayData[i] == selectPic) {
      return res.status(200).json({
        response: false,
        status: "Cant vote same Pic for " + adminData.avatar + " second",
      });
    }
  }

  // console.log(pid1, pid2, uid);
  
  sql = "SELECT * FROM cat_picture WHERE pid = ? OR pid = ?";
  sql = mysql.format(sql, [pid1, pid2]);
  const result = await queryAsync(sql);
  const jsonStr = JSON.stringify(result);
  const jsonObj = JSON.parse(jsonStr);
  const picDetailOriginal1: PictureGetResponse = jsonObj[0];
  const picDetailOriginal2: PictureGetResponse = jsonObj[1];
  // let str = picDetailOriginal1.pid.toString() +"  "+ picDetailOriginal2.pid.toString();
  // res.json(selectPic);
  const score1 = picDetailOriginal1.score;
  const score2 = picDetailOriginal2.score;

  let scoreResult1 =
    1 /
    (1 +
      Math.pow(
        10,
        (picDetailOriginal2.score - picDetailOriginal1.score) / 400
      ));
  let scoreResult2 =
    1 /
    (1 +
      Math.pow(
        10,
        (picDetailOriginal1.score - picDetailOriginal2.score) / 400
      ));
  scoreResult1 = Math.round(scoreResult1 * 100) / 100;
  scoreResult2 = Math.round(scoreResult2 * 100) / 100;
  let w1 = 0,
    w2 = 0;
  if (picDetailOriginal1.pid == selectPic) {
    w1 = 1;
  } else {
    w2 = 1;
  }
  picDetailOriginal1.score = Math.round(
    picDetailOriginal1.score + 20 * (w1 - scoreResult1)
  );
  picDetailOriginal2.score = Math.round(
    picDetailOriginal2.score + 20 * (w2 - scoreResult2)
  );

  sql =
    "INSERT INTO `cat_pic_record` (`r_pid`, `score`, `result`, `r_uid`) VALUES(?,?,?,?)";
  sql = mysql.format(sql, [
    picDetailOriginal1.pid,
    picDetailOriginal1.score,
    w1,
    uid,
  ]);
  conn.query(sql);

  sql =
    "INSERT INTO `cat_pic_record` (`r_pid`, `score`, `result`, `r_uid`) VALUES(?,?,?,?)";
  sql = mysql.format(sql, [
    picDetailOriginal2.pid,
    picDetailOriginal2.score,
    w2,
    uid,
  ]);
  conn.query(sql);

  //   PIC 1
  sql = "SELECT * FROM cat_picture WHERE pid = ?";
  sql = mysql.format(sql, [picDetailOriginal1.pid]);
  const tempPic1 = await queryAsync(sql);
  const tempStr1 = JSON.stringify(tempPic1);
  const tempObj1 = JSON.parse(tempStr1);
  const picDetailTemp1: PictureGetResponse = tempObj1[0];

  const updatePic1 = { ...picDetailTemp1, ...picDetailOriginal1 };

  sql = "UPDATE `cat_picture` SET `picture`=?, `score`=? WHERE pid = ?";
  sql = mysql.format(sql, [
    updatePic1.picture,
    updatePic1.score,
    updatePic1.pid,
  ]);

  conn.query(sql);

  //   PIC 2

  sql = "SELECT * FROM cat_picture WHERE pid = ?";
  sql = mysql.format(sql, [picDetailOriginal2.pid]);
  const tempPic2 = await queryAsync(sql);
  const tempStr2 = JSON.stringify(tempPic2);
  const tempObj2 = JSON.parse(tempStr2);
  const picDetailTemp2: PictureGetResponse = tempObj2[0];

  const updatePic2 = { ...picDetailTemp2, ...picDetailOriginal2 };

  sql = "UPDATE `cat_picture` set `picture`=?, `score`=? WHERE pid = ?";
  sql = mysql.format(sql, [
    updatePic2.picture,
    updatePic2.score,
    updatePic2.pid,
  ]);

  conn.query(sql);

  res.status(201).json({
    response: true,
    equationScore: "1 / ((1 + 10^(score2 - score1) / 400))",
    pic1:
      "score = " +
      scoreResult1 +
      "  from equationScore = 1 / ((1 + 10^(" +
      score2 +
      " - " +
      score1 +
      ") / 400))",
    pic2:
      "score = " +
      scoreResult2 +
      "  from equationScore = 1 / ((1 + 10^(" +
      score1 +
      " - " +
      score2 +
      ") / 400))",
    equationRating:
      "oldRating + K(In this case we use 20) * (win=1:lose=0 - score)",
    rating1:
      "newRating = " +
      picDetailOriginal1.score +
      "  from equationRating = " +
      score1 +
      " + 20 * (" +
      w1 +
      " - " +
      scoreResult1 +
      ")",
    rating2:
      "newRating = " +
      picDetailOriginal2.score +
      "  from equationRating = " +
      score2 +
      " + 20 * (" +
      w2 +
      " - " +
      scoreResult2 +
      ")",
  });
});
