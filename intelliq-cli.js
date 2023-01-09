#!/usr/bin/env node
import chalk from 'chalk';
import chalkAnimation from "chalk-animation";
import inquirer from "inquirer";
import {createSpinner} from "nanospinner";
import axios from "axios";
import ansiRegex from "ansi-regex";

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
    for(const question of questions) {
        console.log('\n')
        const options = await apiGet(`question/${questionnaireId}/${question.qID}`)
        await ask(options.qtext,options.options.map(option => `${chalk.gray(option.optID)}  ${option.opttxt} `));
    }
    // console.log( questions)
}

async function ask(message,choices) {
    const answers = await inquirer.prompt({
        name: 'qID',
        type: 'list',
        message: message,
        choices: choices,
    });
    return
}


async function handleAnswer(answer){
    // const spinner = createSpinner('Getting next question...').start();
    setTimeout(() => {
        spinner.success()
    }, 700)
}

await welcome();
await chooseQQ();

// await ask();
