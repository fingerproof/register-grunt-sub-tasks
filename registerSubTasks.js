/*jshint node:true */

var _ = require("lodash");

function isArrayLike (val) { return _.isArray(val) || _.isArguments(val); }

function format (params, separator) {
	params = isArrayLike(params) ? params : [params];
	if (!_.isFunction(separator)) {
		separator = function separator (curr) { return arguments[1] + curr; };
	}
	return _.reduce(params, function reduce (prev, curr, i, array) {
		return curr ? prev + separator(curr, i, array) : prev;
	}, "");
}

format.grunt = function grunt (params) { return format(params, ":"); };

format.shell = function shell (params) { return format(params, " "); };

function parseDescription (description, sup) {
	description = _.template(description, { sup: sup }).split(": ");
	var name = description[0] === sup ? sup : sup + "-" + description[0];
	return { name: name, summary: description[1] };
}

function gruntTask (task, config, grunt) {
	grunt.registerTask(task.name, task.summary, task.task(config, grunt));
}

function otherTask (task, config, grunt) {
	grunt.config(task.type + "." + task.name, task.task(config, grunt));
	grunt.registerTask(task.name, task.summary, function register () {
		grunt.loadNpmTasks("grunt-" + task.type);
		grunt.task.run(task.type + ":" + task.name + format.grunt(arguments));
	});
}

function formatTasks (tasks, sup) {
	return _.map(tasks, function map (value, description) {
		value = value(format, _);
		description = parseDescription(description, sup);
		var type = description.type = value.type || "grunt";
		description.register = type === "grunt" ? gruntTask : otherTask;
		if (_.isFunction(value.task)) { description.task = value.task; }
		else { description.task = function task () { return value.task; }; }
		return description;
	});
}

function registerSubTasks (sup, tasks) {
	tasks = formatTasks(tasks, sup);
	return function init (grunt) {
		function config (key) { return grunt.config(sup + ".options." + key); }
		function forEach (task) { task.register(task, config, grunt); }
		_.forEach(tasks, forEach);
	};
}

registerSubTasks.unpack = function unpack (string, edit) {
	return string.replace(/(\w+)/g, edit).split(" ");
};

module.exports = registerSubTasks;
