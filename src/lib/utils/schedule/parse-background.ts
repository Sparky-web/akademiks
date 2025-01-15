import { env } from "~/env";
import { db } from "~/server/db";

import axios from 'axios'
import * as cheerio from 'cheerio'
import { google } from 'googleapis'
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

import parseScheduleFromWorkbook from "~/lib/utils/schedule/parse-schedule-from-workbook";
import updateSchedule, { ResultItem } from "~/server/api/routers/schedule/_lib/utils/update-schedule";

const scopes = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];

async function authorize() {
    const client_email = env.GOOGLE_API_EMAIL
    const private_key = env.GOOGLE_API_KEY
    const auth = new google.auth.JWT(client_email, null, private_key, scopes);
    return auth;
}

async function fetchPageLinks(url: string) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const links: string[] = [];

    $('a').each((i, element) => {
        const href = $(element).attr('href');
        if (href && href.includes('docs.google.com/spreadsheets/')) {
            links.push(href);
        }
    });

    return links;
}

async function downloadSpreadsheetAsXLSX(sheetId: string) {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.export({
        auth,
        fileId: sheetId,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }, { responseType: 'stream' });

    return new Promise((resolve, reject) => {
        const chunks = [];

        response.data.on('data', (chunk) => {
            chunks.push(chunk);
        });

        response.data.on('end', () => {
            // Concatenate all the chunks into a single Buffer
            const buffer = Buffer.concat(chunks);
            // Convert Buffer to ArrayBuffer
            const arrayBuffer = new Uint8Array(buffer).buffer;
            resolve(arrayBuffer);
        });

        response.data.on('error', (err) => {
            reject(`Error downloading file: ${err.message}`);
        });
    });
}

export default async function parseBackground() {
    const startedAt = new Date()

    console.log('Triggered parseBackground')
    const config = await db.config.findFirst({
        select: {
            parseSpreadsheetPageUrl: true,
            parseInterval: true
        }
    })

    if (!config) throw new Error('Запись конфигурации в БД не обнаружена')

    let links = await fetchPageLinks(config.parseSpreadsheetPageUrl);

    const reports: ResultItem[] = []

    for (const link of links) {
        const sheetId = link.match(/[-\w]{25,}/)[0];

        if (!sheetId) {
            console.error(`Ошибка при обновлении расписания: ${link}`)
            continue
        }

        try {
            const buffer = await downloadSpreadsheetAsXLSX(sheetId);
            const workbook = XLSX.read(buffer, { type: 'array' });
            const data = parseScheduleFromWorkbook(workbook)
            const result = await updateSchedule(data)
            reports.push(...result)
        } catch (e) {
            console.error(`Ошибка при обновлении расписания: ${sheetId}`, e.message)
        }
        console.log(`Обновлено расписание: ${sheetId}`)
    }

    await db.report.create({
        data: {
            startedAt: startedAt,
            endedAt: new Date(),
            result: JSON.stringify(reports.slice(0, 100))
        }
    })
}

