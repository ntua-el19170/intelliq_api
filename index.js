import express from 'express'
import mysql from 'mysql2'

const app = express();

const PORT = 9103;
const baseUrl = '/intelliq_api';

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

app.get(`${baseUrl}/doanswer/:questionnaireID/:questionID/:session/:optionID`, async (req, res) => {
    const questionnaireId = req.params.questionnaireID;
    const questionId = req.params.questionID;
    const sessionId = req.params.session;
    const optionId = req.params.optionID;
    try {
        await connection.connect();
        const sessionFind = await connection.query(`SELECT * FROM Q_Session WHERE session_id = '${sessionId}'`)
        console.log(sessionFind[0])
        if(sessionFind[0].length==0){
            await connection.query(`INSERT INTO Q_Session VALUES ('${sessionId}','${Date().toString()}','FALSE','${questionnaireId}')`)
        }
        const result = await connection.query(`INSERT INTO Answer VALUES (default,'${sessionId}','${questionId}','${optionId}','${questionnaireId}')`)
        res.send(result)
    }
    catch(error) {
        res.status(500).send({ error: `Could not submit answer \n ${error}` });
    }
})