async function addOverlordsToThread(thread) {

	// Ryan
	await thread.members
		.add('105035733558890496')
		.catch(console.error);

	// Warz
	await thread.members
		.add('205969498908524544')
		.catch(console.error);

	// Bing
	await thread.members
		.add('230118286229110784')
		.catch(console.error);

	// Mart
	await thread.members
		.add('135853920286146560')
		.catch(console.error);
}

exports.addOverlordsToThread = addOverlordsToThread;