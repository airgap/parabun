import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import state from './state.js';
import * as $ from 'svelte/internal/client';

function update() {
	state.count += 1;
}

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);
	$.init();

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, ($.deep_read_state(state), $.untrack(() => state.count))));
	$.event('click', button, update);
	$.append($$anchor, button);
	$.pop();
}