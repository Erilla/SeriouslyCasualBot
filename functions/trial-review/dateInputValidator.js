function dateInputValidator(date) {
	const dateRegex = new RegExp('^\\d{4}\\-(0[1-9]|1[012])\\-(0[1-9]|[12][0-9]|3[01])$');
	return dateRegex.exec(date);
}

exports.dateInputValidator = dateInputValidator;