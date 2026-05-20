import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor) {
	const ping = $.proxy({});

	ping.pong = { ping, pang: 'hello!' };

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, ping.pong.ping.pong.ping.pong.pang));
	$.delegated('click', button, () => ping.pong.pang = 'goodbye!');
	$.append($$anchor, button);
}

$.delegate(['click']);