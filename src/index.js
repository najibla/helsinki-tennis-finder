const fetch = require('node-fetch');
const moment = require('moment');
const jquery = require('jquery');
const { JSDOM } = require('jsdom');
const util = require('util');
const { options } = require('./stdio');

let __userCenters = options.centers;
const __maxDays = options.maxDays;
const __startHour = options.startHour;
const __endHour = options.endHour;
let __weekDays = options.weekDays;

const validCenters = ['smash', 'talin', 'puhos'];

const links = {
	smash: 'https://smashcenter.slsystems.fi',
	talin: 'https://varaukset.talintenniskeskus.fi',
	puhos: 'https://puhoscenter.slsystems.fi',
};

let __allResults = {
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

function parseResults(data, center) {
	const results = [];
	const result = new JSDOM(data);
	const $ = jquery(result.window);
	// get only 60 min available and 30 min available
	$('.s-avail a, .s-avail-short a').each((_i, val) => {
		const href = $(val).attr('href');
		if (href) {
			const params = new URLSearchParams(href.split('?')[1]);
			// this is needed because Smash shows also PALLOTYKKI availabilities
			const courtNo = params.get('resid');
			const startTime = params.get('alkuaika');
			const startingHour = `${moment(startTime).hours()}${moment(
				startTime
			).minute()}`;
			const isGoodTime = startingHour >= __startHour && startingHour <= __endHour;
			if (Number(courtNo) < 30 && isGoodTime) {
				results.push({
					time: startTime,
					duration: params.get('kesto'),
					court: courtNo,
					url: `${links[center]}${href}`,
				});
			}
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

function isValidCenter(center, validCenters) {
	return validCenters.includes(center);
}

function setup() {
	__userCenters = Array.isArray(__userCenters)
		? __userCenters
		: [__userCenters];

	__weekDays = Array.isArray(__weekDays) ? __weekDays : [__weekDays];

	__userCenters.forEach((center) => {
		if (!isValidCenter(center, validCenters)) {
			throw `Invalid center name ${center}`;
		}
	});

	__allResults = deleteUnusedCenters(__userCenters, __allResults);
}

async function main() {
	console.log(
		`Getting results for ${__userCenters.length} centers for ${__maxDays} days`
	);
	await Promise.all(
		// check within 15 days. Count starts from today
		Array.from(Array(Number(__maxDays)).keys()).map(async (i) => {
			const today = moment();
			const theDate = today.add(i, 'days');
			const dayOfWeek = theDate.isoWeekday();
			// check only tuesday => Thursday
			if (__weekDays.includes(dayOfWeek.toString())) {
				const formattedToday = theDate.format('YYYY-MM-DD');
				await Promise.all(
					__userCenters.map(async (center) => {
						const data = await getData(center, formattedToday);
						const parseData = parseResults(data, center);
						if (parseData.length) {
							__allResults[center].push({
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
	return sortResults(__allResults);
}

function deleteUnusedCenters(userCenters, allCenters) {
	for (let key of Object.keys(allCenters)) {
		if (!userCenters.includes(key)) {
			delete allCenters[key];
		}
	}
	return allCenters;
}

function run() {
	try {
		setup();
		main()
			.then((val) => console.log(util.inspect(val, false, null, true)))
			.catch((error) => console.log(util.inspect(error, false, null, true)));
	} catch (e) {
		console.log(e);
	}
}

run();
