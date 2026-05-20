import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div class="svelte-11rsm3o">hi</div> <p class="svelte-11rsm3o">hi</p>`, 1);

const $$css = {
	hash: 'svelte-11rsm3o',
	code: ':host([red]) div.svelte-11rsm3o {color:red;}:host([white]) p.svelte-11rsm3o {color:white;}'
};

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);
	$.append_styles($$anchor, $$css);

	let red = $.prop($$props, 'red', 12, false);

	red();

	var $$exports = {
		get red() {
			return red();
		},

		set red($$value) {
			red($$value);
			$.flush();
		}
	};

	var fragment = root();

	$.next(2);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

customElements.define('my-widget', $.create_custom_element(_unknown_, { red: { reflect: true, type: 'Boolean' } }, [], [], { mode: 'open' }));