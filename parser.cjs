const fs = require('fs');
const readline = require('readline');

const MONTH_MAP = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
};

function toISODate(rawDate) {
    const parts = rawDate.split('-');
    if (parts.length !== 3) return null;
    const day = parts[0].padStart(2, '0');
    const month = MONTH_MAP[parts[1]];
    const year = parts[2];
    if (!month) return null;
    return `${year}-${month}-${day}`;
}

async function parseSyllabus() {
    const fileStream = fs.createReadStream('SSC_CGL_Day_Wise_Study_Calendar_2026_27_shifted.md');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const tasks = [];
    let parsingTable = false;

    for await (const line of rl) {
        if (line.trim().startsWith('| Date | Day |')) {
            parsingTable = true;
            continue;
        }
        if (line.trim().startsWith('|---|---|')) {
            continue;
        }
        
        if (parsingTable && line.trim().startsWith('|')) {
            const parts = line.split('|').map(s => s.trim());
            if (parts.length >= 6) {
                const date = parts[1];
                const subject = parts[3];
                const chapter = parts[4];
                const whatToStudy = parts[5];
                
                const isoDate = toISODate(date);
                if (isoDate && subject) {
                    tasks.push({
                        id: `${date}-${subject}-${chapter}`.replace(/[^a-zA-Z0-9-]/g, ''),
                        date: isoDate,
                        subject,
                        chapter,
                        whatToStudy
                    });
                }
            }
        } else if (line.trim() === '') {
            parsingTable = false;
        }
    }

    if (!fs.existsSync('src/data')) {
        fs.mkdirSync('src/data', { recursive: true });
    }
    
    fs.writeFileSync('src/data/calendarData.json', JSON.stringify(tasks, null, 2));
    console.log(`Parsed ${tasks.length} tasks!`);
}

parseSyllabus();
