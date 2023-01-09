import express from 'express'
import mysql from 'mysql2'
import multer from 'multer'
import fs from "fs";

const app = express();

const PORT = 9103;
const baseUrl = '/intelliq_api';
const upload = multer();

app.use(express.json());

app.listen(PORT,() => console.log(`server running on PORT: ${PORT}`))

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    port: '4321',
    password: '12345',
    database: 'que_database'
}).promise();



app.get(baseUrl,(req,res)=>{
    res.send('welcome to intelliq')
});

app.get(`${baseUrl}/questionnaires`, async (req, res) => {
    try {
        await connection.connect()
        let questionnaires = await connection
            .query(`SELECT * FROM Questionnaire`);
        res.send(questionnaires[0]);
    }
    catch(error) {
        res.send({"error":"Failed to get questionnaires"})
    }
})


// 1
app.get(`${baseUrl}/admin/healthcheck`, async (req, res) => {
    let connectionString;
    try {
        await connection.connect()
        connectionString = `server=${connection.config.host};user id=${connection.config.user};password=${connection.config.password};database=${connection.config.database}`;
        res.send({"status":"OK", "dbconnection": connectionString});
    }
    catch(error) {
        connectionString = `server=${connection.config.host};user id=${connection.config.user};password=${connection.config.password};database=${connection.config.database}`;
        res.send({"status":"failed", "dbconnection": connectionString})
    }
})
// 2
app.post(`${baseUrl}/admin/questionnaire_upd`, upload.single('file'), async (req, res) => {
    try {
        await connection.connect();
        const jsonString = req.file.buffer.toString('utf8');
        const QQ = JSON.parse(jsonString);
        const qqExists = await connection.query(`SELECT * FROM Questionnaire WHERE questionnaire_id = QQ.questionnaireID`);
        if(qqExists.length!==0){
            throw 'Already exists'
        }
        await connection.query(`INSERT INTO Questionnaire VALUES ('${QQ.questionnaireID}', '${QQ.questionnaireTitle}','${QQ.keywords.join(',')}')`);
        for(let question of QQ.questions) {
            await connection.query(`INSERT INTO Question VALUES ('${question.qID}', '${question.qtext}','${question.required}','${question.type}','${QQ.questionnaireID}')`);
        }
        for(let question of QQ.questions) {
            for(let option of question.options) {
                await connection.query(`INSERT INTO Q_Option VALUES ('${option.optID}', '${option.opttxt}','${question.qID}',${option.nextqID=='-' ? null : `'${option.nextqID}'`},'${QQ.questionnaireID}')`)
            }
        }
    }
    catch(error) {
        res.send('Failed to upload questionnaire')
    }
})
// a
app.get(`${baseUrl}/questionnaire/:questionnaireID`, async (req, res) => {
    const questionnaireId = req.params.questionnaireID;
    try {
        await connection.connect();
        let questions = await connection.query(`SELECT * FROM Question WHERE questionnaire_id = '${questionnaireId}'`);
        questions = questions[0];
        let questionList = [];
        for(const question of questions) {
            questionList.push(
                {
                    "qID": question.question_id,
                    "qtext": question.question_text,
                    "required": question.required,
                    "type": question.q_type
                }
            )
        }
        const questionnaire = await connection.query(`SELECT * FROM Questionnaire WHERE questionnaire_id = '${questionnaireId}'`);
        let questionnaireTitle = questionnaire[0][0].title;
        let keywords = questionnaire[0][0].keywords.split(',');
        res.send({"questionnaireID": questionnaireId, "questionnaireTitle":questionnaireTitle,"keywords":keywords, "questions": questionList});
    }
    catch(error) {
        res.status(500).send({ error: "Could not get questionnaire" });
    }
})
// b
app.get(`${baseUrl}/question/:questionnaireID/:questionID`, async (req, res) => {
    const questionnaireId = req.params.questionnaireID;
    const questionId = req.params.questionID;
    try {
        await connection.connect();
        let question = await connection
            .query(`SELECT * FROM Question
         WHERE questionnaire_id = '${questionnaireId}' AND question_id = '${questionId}'`);
        question = question[0][0];
        let options = await connection
            .query(`SELECT * FROM Q_Option o 
                        INNER JOIN Question q ON o.question_id = q.question_id 
                        WHERE o.question_id = '${questionId}' AND q.questionnaire_id = '${questionnaireId}';`)
        let optionList = [];
        for(const option of options[0]) {
            optionList.push(
                {
                    "optID": option.option_id,
                    "opttxt": option.option_text,
                    "nextqID": option.next_q_id,
                }
            )
        }
        console.log(optionList)
        res.send(
            {
                "questionnaireID": questionnaireId,
                "qID": questionId,
                "qtext": question.question_text,
                "required": question.required,
                "type": question.q_type,
                "options": optionList,
            });
    }
    catch(error) {
        res.status(500).send({ error: "Could not get question" });
    }
})
// c
app.get(`${baseUrl}/doanswer/:questionnaireID/:questionID/:session/:optionID`, async (req, res) => {
    const questionnaireId = req.params.questionnaireID;
    const questionId = req.params.questionID;
    const sessionId = req.params.session;
    const optionId = req.params.optionID;
    try {
        await connection.connect();
        const sessionFind = await connection.query(`SELECT * FROM Q_Session WHERE session_id = '${sessionId}'`)
        if(sessionFind[0].length==0){
            await connection.query(`INSERT INTO Q_Session VALUES ('${sessionId}','${Date().toString()}','FALSE','${questionnaireId}')`)
        }
        const answerExists = await connection.query(`SELECT * FROM Answer WHERE session_id = '${sessionId}' AND question_id = '${questionId}'`)
        if(answerExists[0].length==0){
            const result = await connection.query(`INSERT INTO Answer VALUES (default,'${sessionId}','${questionId}','${optionId}','${questionnaireId}')`)
            res.send(result)
        }
        else throw 'Already in database';
    }
    catch(error) {
        res.status(500).send({ error: `Could not submit answer \n ${error}` });
    }
})
// d
