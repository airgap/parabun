import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let clientWidth = $.fallback($$props['clientWidth'], 1);
	let clientHeight = $.fallback($$props['clientHeight'], 2);
	let offsetHeight = $.fallback($$props['offsetHeight'], 3);
	let offsetWidth = $.fallback($$props['offsetWidth'], 4);
	let audioDuration = $.fallback($$props['audioDuration'], 5);
	let audioBuffered = $.fallback($$props['audioBuffered'], 6);
	let audioSeekable = $.fallback($$props['audioSeekable'], 7);
	let audioPlayed = $.fallback($$props['audioPlayed'], 8);
	let videoDuration = $.fallback($$props['videoDuration'], 9);
	let videoBuffered = $.fallback($$props['videoBuffered'], 10);
	let videoSeekable = $.fallback($$props['videoSeekable'], 11);
	let videoPlayed = $.fallback($$props['videoPlayed'], 12);
	let value = $.fallback($$props['value'], '/some/file');

	$$renderer.push(`<div></div> <audio></audio> <video></video> <input type="file"/>`);

	$.bind_props($$props, {
		clientWidth,
		clientHeight,
		offsetHeight,
		offsetWidth,
		audioDuration,
		audioBuffered,
		audioSeekable,
		audioPlayed,
		videoDuration,
		videoBuffered,
		videoSeekable,
		videoPlayed,
		value
	});
}