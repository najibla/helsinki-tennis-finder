const fetch = require('node-fetch');
const moment = require('moment');
const jquery = require('jquery');
const { JSDOM } = require('jsdom');
const util = require('util');

const centers = ['smash', 'talin', 'puhos'];

const links = {
	smash: 'https://smashcenter.slsystems.fi',
	talin: 'https://varaukset.talintenniskeskus.fi',
	puhos: 'https://puhoscenter.slsystems.fi',
};

const allResults = {
	smash: [],
	talin: [],
	puhos: [],
};

async function getData(centerName, date) {
	const resp = await fetch(
		`${links[centerName]}/booking/booking-calendar?BookingCalForm%5Bp_pvm%5D=${date}`
	).catch(`Coulnt get data for ${centerName} in date ${date}`);

	return await resp.text();
}

function parseResults(data) {
	const results = [];
	const result = new JSDOM(data);
	const $ = jquery(result.window);
	// get only 60 min available and 30 min available
	$('.s-avail a, .s-avail-short a').each((_i, val) => {
		const params = new URLSearchParams($(val).attr('href').split('?')[1]);
		// this is needed because Smash shows also PALLOTYKKI availabilities
		const courtNo = params.get('resid');
		const startTime = params.get('alkuaika');
		const startingHour = `${moment(startTime).hours()}${moment(
			startTime
		).minute()}`;
		const isGoodTime = startingHour > '165' && startingHour < '194';
		if (Number(courtNo) < 30 && isGoodTime) {
			results.push({
				time: startTime,
				duration: params.get('kesto'),
				court: courtNo,
			});
		}
	});
	return results;
}

function sortResults(result) {
	for (const [key, value] of Object.entries(result)) {
		result[key] = value.sort((a, b) => a.date.localeCompare(b.date));
	}
	return result;
}

async function main() {
	await Promise.all(
		// check within 15 days
		Array.from(Array(15).keys()).map(async (i) => {
			const today = moment();
			const theDate = today.add(i, 'days');
			const dayOfWeek = theDate.weekday();
			// check only tuesday => Thursday
			if (dayOfWeek > 1 && dayOfWeek < 5) {
				const formattedToday = theDate.format('YYYY-MM-DD');
				await Promise.all(
					centers.map(async (center) => {
						const data = await getData(center, formattedToday);
						const parseData = parseResults(data);
						if (parseData.length) {
							allResults[center].push({
								date: formattedToday,
								availablitites: parseData,
							});
						}
						return Promise.resolve();
					})
				);
			}
		})
	);
	return sortResults(allResults);
}

main()
	.then((val) => console.log(util.inspect(val, false, null, true)))
	.catch((error) => console.log(util.inspect(error, false, null, true)));
