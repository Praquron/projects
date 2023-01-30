let mode = "pause";
let loaded = false;
	
const button = document.getElementById("button");
const range = document.getElementById("range");

button.addEventListener('click', function(event) {
	if (mode == "play") {
		mode = "pause";
		button.innerHTML = "Play";
		range.disabled = false;
	} else if (mode == "pause") {
		mode = "play";
		button.innerHTML = "Pause";
		range.disabled = true;
	}
});

const file = document.getElementById("file");
file.addEventListener('change', function(event) {
	file.disabled = true;
	startViewer(event.target.files[0]);
});

function startViewer(file) {
	const reader = new FileReader();
	reader.addEventListener('load', function(event) {
		range.value = 0;
		let midi = parseMIDI(MidiConvert.parse(event.target.result));

		colorInput = document.getElementById("colorInput");
		let color = [[], []];
		for (let i = 0; i < midi.trackLength; i++) {
			const hex = '#' + Math.round(Math.random() * 0xffffff).toString(16)
			color[0].push(hex);
			color[1].push(changeBrightness(hex, -20));
		}
		
		setupSVG(midi, color);
		loaded = true;

		range.max = midi.duration;
		range.disabled = false;
		range.addEventListener('input', function() {
			if (mode == "pause") {
				midi.currentTime = Number(range.value);
				midi = update(midi, color);
			}
		});

		for (let i = 0; i < midi.trackLength; i++) {
			let colorInputItem = document.createElement('input');
			colorInputItem.setAttribute('id', "color" + i.toString());
			colorInputItem.setAttribute('type', "color");
			colorInputItem.setAttribute('value', color[0][i]);
			
			colorInputItem.addEventListener('input', function() {
				color[0][i] = colorInputItem.value;
				color[1][i] = changeBrightness(colorInputItem.value, -20);
				midi = update(midi, color);
			});
			colorInput.appendChild(colorInputItem);
		}

		midi = update(midi, color);
		setInterval(function() {
			if (mode == "play") {
				midi = update(midi, color);
			}		
		}, 1000 / 60);
	});
	reader.readAsBinaryString(file);
}

function parseMIDI(midi) {
	let parsedMidi = {
		timeSignature: [midi.header.timeSignature[0], midi.header.timeSignature[0]],
		tempo: midi.header.bpm,
		duration: midi.duration,
		trackLength: midi.tracks.length,
		notes: [],
		currentTime: 0
	};

	for (let i = 0; i < midi.tracks.length; i++) {
		for (let j = 0; j < midi.tracks[i].length; j++) {
			parsedMidi.notes.push({
				track: i,
				tone: midi.tracks[i].notes[j].midi,
				start: midi.tracks[i].notes[j].time,
				duration: midi.tracks[i].notes[j].duration,
				end: midi.tracks[i].notes[j].time + midi.tracks[i].notes[j].duration,
				played: false
			});
		}
	}
	return parsedMidi;
}

function setupSVG(midi, color, seconds = 5) {	
	let viewer;
	if (loaded) {
		viewer = SVG("#viewer");
	} else {
		viewer = SVG().addTo("#viewer").size(1848, 1040);
	}
	
	viewer.rect(1848, 1040).addClass("background").fill('#0f0f0f');

	const keyMarker = viewer.group().addClass("keyMarker");
	for (let i = 0; i < 11; i++) {
		const octave = keyMarker.group();
		const octaveX = [(24 * 3) - 1, (24 * 7) - 1];
		for (let j = 0; j < 2; j++) {
			octave.rect(2, 1040).move((i * (24 * 7)) + octaveX[j], 0).fill('#2f2f2f');
		}
	}

	const notes = viewer.group().addClass("notes");
	const notesX = [0, 15, 24, 43, 48, 72, 85, 96, 113, 120, 141, 144];
	const notesWidth = [24, 14, 24, 14, 24, 24, 14, 24, 14, 24, 14, 24];
	const whiteNotesId = [0, 2, 4, 5, 7, 9, 11];
	const whiteNotesColor = color[0];
	const blackNotesColor = color[1];
	const notesText = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
	for (let i = 0; i < midi.notes.length; i++) {
		const notesGroup = notes.group()
		if (whiteNotesId.indexOf(midi.notes[i].tone % 12) > -1) {
			notesGroup.rect(notesWidth[midi.notes[i].tone % 12], midi.notes[i].duration * ((1040 - 75) / seconds)).move((Math.floor(midi.notes[i].tone / 12) * (24 * 7)) + notesX[midi.notes[i].tone % 12], (1040 - 75) - (midi.notes[i].end * ((1040 - 75) / seconds))).fill(whiteNotesColor[midi.notes[i].track]);
			if ((hexToHSL(whiteNotesColor[midi.notes[i].track]).s >= 75) || (hexToHSL(whiteNotesColor[midi.notes[i].track]).l >= 75)) {
				notesGroup.text(notesText[midi.notes[i].tone % 12]).move(((Math.floor(midi.notes[i].tone / 12) * (24 * 7)) + notesX[midi.notes[i].tone % 12]) + (24 / 2), ((1040 - 75) - (midi.notes[i].start * ((1040 - 75) / seconds))) - 20).font({
					family: "Helvetica",
					size: 24,
					anchor: 'middle'
				}).fill('#1f1f1f');
			} else {
				notesGroup.text(notesText[midi.notes[i].tone % 12]).move(((Math.floor(midi.notes[i].tone / 12) * (24 * 7)) + notesX[midi.notes[i].tone % 12]) + (24 / 2), ((1040 - 75) - (midi.notes[i].start * ((1040 - 75) / seconds))) - 20).font({
					family: "Helvetica",
					size: 24,
					anchor: 'middle'
				}).fill('#f0f0f0');
			}
		} else {
			notesGroup.rect(notesWidth[midi.notes[i].tone % 12], midi.notes[i].duration * ((1040 - 75) / seconds)).move((Math.floor(midi.notes[i].tone / 12) * (24 * 7)) + notesX[midi.notes[i].tone % 12], (1040 - 75) - (midi.notes[i].end * ((1040 - 75) / seconds))).fill(blackNotesColor[midi.notes[i].track]);
			if ((hexToHSL(blackNotesColor[midi.notes[i].track]).s >= 75) || (hexToHSL(blackNotesColor[midi.notes[i].track]).l >= 75)) {
				notesGroup.text(notesText[midi.notes[i].tone % 12]).move(((Math.floor(midi.notes[i].tone / 12) * (24 * 7)) + notesX[midi.notes[i].tone % 12]) + (14 / 2), ((1040 - 75) - (midi.notes[i].start * ((1040 - 75) / seconds))) - 20).font({
					family: "Helvetica",
					size: 14,
					anchor: 'middle'
				}).fill('#1f1f1f');
			} else {
				notesGroup.text(notesText[midi.notes[i].tone % 12]).move(((Math.floor(midi.notes[i].tone / 12) * (24 * 7)) + notesX[midi.notes[i].tone % 12]) + (14 / 2), ((1040 - 75) - (midi.notes[i].start * ((1040 - 75) / seconds))) - 20).font({
					family: "Helvetica",
					size: 14,
					anchor: 'middle'
				}).fill('#f0f0f0');
			}
		}
	}

	const piano = viewer.group().addClass("piano");
	for (let i = 0; i < 11; i++) {
		const octave = piano.group();
		for (let j = 0; j < 7; j++) {
			octave.rect(24, 75).move(((j * 24) + (i * (24 * 7))), 1040 - 75).fill('#f0f0f0');
		}
		const blackX = [15, 43, 85, 113, 141];
		for (let j = 0; j < 5; j++) {
			octave.rect(14, 45).move(blackX[j] + (i * (24 * 7)), 1040 - 75).fill('#0f0f0f');
		}
	}

	const metronome = viewer.group().addClass("metronome");
	metronome.rotate(180, 1848 - ((20 / 2) + 10), (20 / 2) + 10);
	metronome.circle(20).move(1848 - (20 + 10), 10).fill('#2f2f2f');
	for (let i = 0; i < midi.timeSignature[0]; i++) {
		const metronomeSection = metronome.group().addClass("beat" + i.toString());
		for (let j = 0; j < (360 / midi.timeSignature[0]); j++) {
			metronomeSection.line(1848 - ((20 / 2) + 10), (20 / 2) + 10, (1848 - ((20 / 2) + 10)) + (Math.sin(degreesToRadians((i * (360 / midi.timeSignature[0])) + j)) * (20 / 2)), ((20 / 2) + 10) + (Math.cos(degreesToRadians((i * (360 / midi.timeSignature[0])) + j)) * (20 / 2))).stroke({
				width: 0.5,
				color: '#f0f0f0',
				opacity: 1
			});
		}
	}
}

function update(midi, color, seconds = 5) {
	let updatedMidi = midi

	const viewer = SVG("#viewer");
		
	const notes = viewer.findOne(".notes");
	const whiteNotesId = [0, 2, 4, 5, 7, 9, 11];
	const whiteNotesColor = color[0];
	const blackNotesColor = color[1];

	const piano = viewer.findOne(".piano");
	const pianoId = [0, 2, 4, 5, 7, 9, 11, 1, 3, 6, 8, 10];
	const pianoColor = ['#f0f0f0', '#0f0f0f', '#f0f0f0', '#0f0f0f', '#f0f0f0', '#f0f0f0', '#0f0f0f', '#f0f0f0', '#0f0f0f', '#f0f0f0', '#0f0f0f', '#f0f0f0'];
	for (let i = 0; i < updatedMidi.notes.length; i++) {
		const notesGroup = notes.get(i);
		    
		if (whiteNotesId.indexOf(updatedMidi.notes[i].tone % 12) > -1) {
			notesGroup.get(0).fill({
				color: whiteNotesColor[updatedMidi.notes[i].track]
			});
			
			if (((hexToHSL(whiteNotesColor[midi.notes[i].track]).s >= 75) && (hexToHSL(whiteNotesColor[midi.notes[i].track]).l >= 50)) || (hexToHSL(whiteNotesColor[midi.notes[i].track]).l >= 75)) {
				notesGroup.get(1).fill('#1f1f1f');
			} else {
			    notesGroup.get(1).fill('#f0f0f0');
		    }
	    } else {
		    notesGroup.get(0).fill({
			    color: blackNotesColor[updatedMidi.notes[i].track]
		    });

			if (((hexToHSL(blackNotesColor[midi.notes[i].track]).s >= 75) && (hexToHSL(blackNotesColor[midi.notes[i].track]).l >= 50)) || (hexToHSL(blackNotesColor[midi.notes[i].track]).l >= 75)) {
		        notesGroup.get(1).fill('#1f1f1f');
		    } else {
				notesGroup.get(1).fill('#f0f0f0');
			}
		}
		
		if (mode == "play") {
			if ((((1040 - 75) - ((midi.notes[i].start - midi.currentTime) * ((1040 - 75) / seconds))) >= 0) && (((1040 - 75) - ((midi.notes[i].end - midi.currentTime) * ((1040 - 75) / seconds))) <= 1040)) {
				notesGroup.y((1040 - 75) - ((midi.notes[i].end - midi.currentTime) * ((1040 - 75) / seconds)));	
			}
			if ((updatedMidi.notes[i].played == true) && (updatedMidi.currentTime < updatedMidi.notes[i].start)) {
				piano.get(Math.floor(updatedMidi.notes[i].tone / 12)).get(pianoId.indexOf(updatedMidi.notes[i].tone % 12)).fill({
					color: pianoColor[updatedMidi.notes[i].tone % 12]
				});
			} else if ((updatedMidi.notes[i].played == false) && ((updatedMidi.currentTime >= updatedMidi.notes[i].start) && (updatedMidi.currentTime <= updatedMidi.notes[i].end))) {
			    if (whiteNotesId.indexOf(updatedMidi.notes[i].tone % 12) > -1) {
				    piano.get(Math.floor(updatedMidi.notes[i].tone / 12)).get(pianoId.indexOf(updatedMidi.notes[i].tone % 12)).fill({
					    color: whiteNotesColor[updatedMidi.notes[i].track]
				    });
			    } else {
				    piano.get(Math.floor(updatedMidi.notes[i].tone / 12)).get(pianoId.indexOf(updatedMidi.notes[i].tone % 12)).fill({
					    color: blackNotesColor[updatedMidi.notes[i].track]
				    });
				}
			} else if ((updatedMidi.notes[i].played == false) && (updatedMidi.currentTime > updatedMidi.notes[i].end)) {
				updatedMidi.notes[i].played = true;
				piano.get(Math.floor(updatedMidi.notes[i].tone / 12)).get(pianoId.indexOf(updatedMidi.notes[i].tone % 12)).fill({
					color: pianoColor[updatedMidi.notes[i].tone % 12]
				});
			}
		} else if (mode == "pause") {
			notesGroup.y((1040 - 75) - ((midi.notes[i].end - midi.currentTime) * ((1040 - 75) / seconds)));
			if (updatedMidi.currentTime > updatedMidi.notes[i].end) {
			    updatedMidi.notes[i].played = true;
		    } else {
			    updatedMidi.notes[i].played = false;
		    }
			piano.get(Math.floor(updatedMidi.notes[i].tone / 12)).get(pianoId.indexOf(updatedMidi.notes[i].tone % 12)).fill({
				color: pianoColor[updatedMidi.notes[i].tone % 12]
			});
		}
	}

	const metronome = viewer.findOne(".metronome");
	for (let i = 0; i < updatedMidi.timeSignature[0]; i++) {
		const metronomeSection = metronome.findOne(".beat" + i.toString());
		if (i <= (updatedMidi.currentTime / (updatedMidi.tempo / (960 / updatedMidi.timeSignature[1])) % updatedMidi.timeSignature[0])) {
			for (let j = 0; j < (360 / updatedMidi.timeSignature[0]); j++) {
				metronomeSection.get(j).stroke({
					opacity: 1
				});
			}
		} else {
			for (let j = 0; j < (360 / updatedMidi.timeSignature[0]); j++) {
				metronomeSection.get(j).stroke({
					opacity: 0
				});
			}
		}
	}

	if (updatedMidi.currentTime >= updatedMidi.duration) {
		for (let i = 0; i < updatedMidi.notes.length; i++) {
			updatedMidi.notes[i].played = false;
		}
		updatedMidi.currentTime = 0;
		
		mode = "pause";
		button.innerHTML = "Play";
		range.disabled = false;
		
	} else {
		if (mode == "play") {
			updatedMidi.currentTime += 1 / 60;
		}
	}
	range.value = updatedMidi.currentTime;
	return updatedMidi;
}

function degreesToRadians(degrees) {
	return degrees * (Math.PI / -180);
}

function hexToHSL(hex) {
	let r = '0x' + (hex[1] + hex[2]);
	let g = '0x' + (hex[3] + hex[4]);
	let b = '0x' + (hex[5] + hex[6]);

	r /= 255;
	g /= 255;
	b /= 255;
	
	let min = Math.min(r, g, b);
	let max = Math.max(r, g, b);
	let delta = max - min;

	let h = 0;
	let s = 0;
	let l = 0;

	if (delta == 0) {
		h = 0;
	} else if (max == r) {
		h = ((g - b) / delta) % 6;
	} else if (max == g) {
		h = ((b - r) / delta) + 2;
	} else if (max == b) {
		h = ((r - g) / delta) + 4;
	}
	h = Math.round(h * 60);
	if (h < 0) {
		h += 360;
	}

	l = (max + min) / 2;

	if (delta == 0) {
		s = 0;
	} else {
		s = delta / (1 - Math.abs(2 * l - 1));
	}
	s = (s * 100);
	l = (l * 100);

	let hsl = {
		h: h,
		s: s,
		l: l
	}
	return hsl;
}
function HSLtoHex(hsl) {
	let h = hsl.h;
	let s = hsl.s / 100;
	let l = hsl.l / 100;

	let c = (1 - Math.abs(2 * l - 1)) * s;
	let x = c * (1 - Math.abs((h / 60) % 2 - 1));
	let m = l - c / 2;
	let r = 0;
	let g = 0;
	let b = 0;

	if ((0 <= h) && (h < 60)) {
		r = c;
		g = x; 
		b = 0;
	} else if ((60 <= h) && (h < 120)) {
		r = x;
		g = c;
		b = 0;
	} else if ((120 <= h) && (h < 180)) {
		r = 0;
		g = c;
		b = x;
	} else if ((180 <= h) && (h < 240)) {
		r = 0;
		g = x;
		b = c;
	} else if ((240 <= h) && (h < 300)) {
		r = x;
		g = 0;
		b = c;
	} else if ((300 <= h) && (h < 360)) {
		r = c;
		g = 0;
		b = x;
	}
	
	r = Math.round((r + m) * 255).toString(16);
	g = Math.round((g + m) * 255).toString(16);
	b = Math.round((b + m) * 255).toString(16);
	if (r.length == 1) {
		r = '0' + r;
	}
	if (g.length == 1) {
		g = '0' + g;
	}
	if (b.length == 1) {
		b = '0' + b;
	}
	return '#' + r + g + b;
}
function changeBrightness(hex, brightness) {
	let hsl = hexToHSL(hex);

	hsl.l += brightness;
	if (hsl.l < 0) {
		hsl.l = 0;
	} else if (hsl.l > 100) {
		hsl.l = 100;
	}
	
	return HSLtoHex(hsl);
}