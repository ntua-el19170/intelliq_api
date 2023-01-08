const express = require('express')
// const request = require('request-promise')
const app = express();
const mysql = require('mysql2')

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

async function test() {
    const result = await connection.query("SHOW COLUMNS FROM Question");
    return result;
}

app.get(baseUrl,(req,res)=>{
    res.send('welcome to intelliq')
});

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