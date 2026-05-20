import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>Hello world!</h1>`);

export default function _unknown_($$anchor) {
	var h1 = root();

	$.append($$anchor, h1);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, {}, [], [], { mode: 'closed' }));