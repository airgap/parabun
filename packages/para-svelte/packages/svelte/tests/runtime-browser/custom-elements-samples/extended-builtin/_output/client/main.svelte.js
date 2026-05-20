import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import "./custom-button.js";

var root = $.from_html(`<button is="custom-button">click me</button>`, 2);

export default function _unknown_($$anchor) {
	var button = root();

	$.append($$anchor, button);
}

customElements.define('custom-element', $.create_custom_element(_unknown_, {}, [], [], { mode: 'open' }));