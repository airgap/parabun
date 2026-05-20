import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p class="svelte-1a7i8ec">styled</p>`);

const $$css = {
	hash: 'svelte-1a7i8ec',
	code: 'p.svelte-1a7i8ec {color:red;}'
};

export default function _unknown_($$anchor) {
	$.append_styles($$anchor, $$css);

	var p = root();

	$.append($$anchor, p);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, {}, [], [], { mode: 'open' }));