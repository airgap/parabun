import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from "svelte";

var root = $.from_html(`<button>bubble click</button>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();

	$.init();

	var button = root();

	$.event('click', button, () => dispatch("custom", "foo"));
	$.append($$anchor, button);
	$.pop();
}

customElements.define('custom-element', $.create_custom_element(_unknown_, {}, [], [], { mode: 'open' }));