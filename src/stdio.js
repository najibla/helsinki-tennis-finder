const stdio = require('stdio');

var options = stdio.getopt({
	maxDays: {
		maxArgs: 1,
		default: 15,
		args: 1,
		description: 'Number of days to search for',
	},
	startHour: {
        key: '-sh',
		maxArgs: 1,
		default: '0',
		args: 1,
		description: 'Starting hour of the day before which to look for slots',
	},
	endHour: {
        key: '-eh',
		maxArgs: 1,
		default: '2359',
		args: 1,
		description: 'Ending hour of the day before which to look for slots',
	},
	centers: {
		key: 'c',
		args: '*',
        minArgs: 1,
        multiple: true,
		default: ['smash', 'talin', 'puhos'],
		description: 'Center names',
	},
    weekDays: {
        key: 'd',
        args: '*',
        minArgs: 1,
        multiple: true,
        default: [1,2,3,4, 5, 6 ,7],
        description: 'Days of the week, 1 for Monday, 2 for Tuesday, etc.. '
    }
});

module.exports = {
	options,
};
