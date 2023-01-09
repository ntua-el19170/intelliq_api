#!/usr/bin/env node
import chalk from 'chalk';
import chalkAnimation from "chalk-animation";
import inquirer from "inquirer";
import {createSpinner} from "nanospinner";
import axios from "axios";
import ansiRegex from "ansi-regex";
import fs from 'fs'
import FormData from "form-data";

let questionnaireId;

function generateSessionId() {
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
    let randomString = '';
    for (let i = 0; i < 4; i++) {
        randomString += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
    }
    return randomString;
}

async function apiGet( parameters ) {
    try{
        const response = await axios.get(`http://localhost:9103/intelliq_api/${parameters}`)
        return response.data;
    }
    catch (error) {
        return error;
    }
}

const sleep = (ms = 2000) => new Promise((r) => setTimeout(r,ms))

async function welcome() {
    const welcomeMessage = chalkAnimation.karaoke('Welcome to Intelliq!')
    await sleep()
    const sessionId = generateSessionId();
    // const spinner = createSpinner('Getting next question...\n ').start();
    console.log(`${chalk.magenta(`Your session id is: ${sessionId}`)}\n`)
}

async function chooseQQ() {
    const questionnairesList = await apiGet('questionnaires');
    let questionnaires = questionnairesList.map(QQ => `${chalk.gray(QQ.questionnaire_id)}  ${QQ.title} ${chalk.gray('(',QQ.keywords,')')}`);
    const options = await inquirer.prompt({
        name: 'questionnaire',
        type: 'list',
        message: 'Please choose a questionnaire:',
        choices: questionnaires,
    });
    questionnaireId = options.questionnaire.split(' ')[0].replace(ansiRegex(), '');
    await showQuestions(questionnaireId);
}
// const spinner = createSpinner('Getting next question...\n ').start();

async function showQuestions(questionnaireId) {
    const questions = (await apiGet(`questionnaire/${questionnaireId}`)).questions;
    let currentQuestion = questions[0]
    while(currentQuestion){
        const options = await apiGet(`question/${questionnaireId}/${currentQuestion.qID}`)
        let choice = await ask(options.qtext, options.options.map((option) => {
            return {
                name: `${chalk.gray(option.optID)}  ${option.opttxt}`,
                value: option.nextqID
            }
        }));
        if(choice==null) break;
        currentQuestion = await apiGet(`question/${questionnaireId}/${choice}`)
    }
    console.log(chalk.magenta('\n You have answered all the questions! \n'))
    const doSubmit = await ask(chalk.yellow('Would you like to submit your answers?'), ['Yes','No'])
    if(doSubmit==='Yes') {
        console.log('Successfully submitted answers')
    }
    else {
        console.log('Submission Canceled')
    }
}

async function ask(message,choices) {
    const answers = await inquirer.prompt({
        name: 'qID',
        type: 'list',
        message: message,
        choices: choices,
    });
    return answers.qID
}


async function handleAnswer(answer){
    // const spinner = createSpinner('Getting next question...').start();
    setTimeout(() => {
        spinner.success()
    }, 700)
}

async function uploadQQ(filePath) {
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    try {
        const response = await axios.post('http://localhost:9103/intelliq_api/admin/questionnaire_upd', form, {
            headers: form.getHeaders()
        });
    } catch (error) {
        console.error(error);
    }
}

await uploadQQ('./Q000.json')

await welcome();
await chooseQQ();

await ask();